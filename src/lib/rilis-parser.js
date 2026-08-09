import crypto from 'crypto'

const RE_ANDROID =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\s*(AM|PM|am|pm))?\s+-\s+(.*)$/
const RE_IOS =
  /^\[(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\s*(AM|PM|am|pm))?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s*(.*)$/

const POLA_SISTEM = [
  /^Pesan dan (telepon|panggilan)/i,
  /^Anda (yang |)(membuat grup|menambahkan|mengeluarkan|keluar|mengubah)/i,
  /bergabung dari komunitas$/i,
  /(bergabung|keluar) (menggunakan tautan|dari grup)/i,
  /mengubah (subjek|ikon|deskripsi|setelan|nomor|nama grup)/i,
  /telah (bergabung|keluar)/i,
]

// Header rilis kadang ditulis "SEKTOR X" atau salah ketik "POLSK X"
const RE_PENANDA = /\b(KA)?(POLSEK|SEKTOR|POLSK)\s/
const RE_MEDIA = /<Media tidak disertakan>|<attached:|Pesan ini dihapus|omitted>/i

// Rilis asli selalu panjang (di file uji: 27-31 baris). Ambang ini menyaring
// obrolan seperti "Polsek Banyuwangi" yang kebetulan menyebut nama polsek.
const MIN_BARIS = 3
const MIN_KARAKTER = 80
const RE_URL_ISI = /https?:\/\//gi
// Penanda surat resmi — rilis formal hampir selalu punya salah satunya.
const RE_STRUKTUR =
  /\b(PERIHAL|KEPADA\s*YTH|DARI\s*:|TEMBUSAN|MOHON\s*IJIN\s*MELAPORKAN|MOHON\s*IZIN\s*MELAPORKAN|URAIAN\s*KEGIATAN|HASIL\s*GIAT)\b/i

export function preprocessTxt(raw) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
}

const normTahun = (y) => (Number(y) < 100 ? 2000 + Number(y) : Number(y))

function cocokkanHeader(line) {
  let m = RE_ANDROID.exec(line)
  if (m) {
    const [, d, mo, y, hh, mm, , , sisa] = m
    return { tanggal: { y: normTahun(y), m: +mo, d: +d }, jam: +hh, menit: +mm, sisa }
  }
  m = RE_IOS.exec(line)
  if (m) {
    const [, hh, mm, , , d, mo, y, sisa] = m
    return { tanggal: { y: normTahun(y), m: +mo, d: +d }, jam: +hh, menit: +mm, sisa }
  }
  return null
}

const barisSistem = (t) => POLA_SISTEM.some((re) => re.test(t))

/**
 * Rakit baris jadi PESAN UTUH. Beda dari ekstrakUrl() di wa-txt-parser.js yang
 * balikin per baris — di sini satu rilis adalah satu pesan multi-baris, jadi
 * badannya harus utuh untuk bisa di-hash.
 */
export function parsePesanUtuh(raw) {
  const baris = preprocessTxt(raw).split('\n')
  const pesan = []
  let aktif = null // WAJIB di luar loop: baris lanjutan nyambung ke pesan terakhir
  const stat = { baris: baris.length, pesan: 0, sistem: 0 }

  for (const asli of baris) {
    const line = asli.trimEnd()
    const head = cocokkanHeader(line)
    if (head) {
      const pisah = head.sisa.indexOf(':')
      if (pisah === -1 || barisSistem(head.sisa)) {
        stat.sistem++
        aktif = null
        continue
      }
      aktif = {
        tanggal: head.tanggal,
        jam: head.jam,
        menit: head.menit,
        pengirim: head.sisa.slice(0, pisah).trim(),
        baris: [head.sisa.slice(pisah + 1).trim()],
      }
      pesan.push(aktif)
      stat.pesan++
      continue
    }
    if (aktif) aktif.baris.push(line)
  }
  return { pesan, stat }
}

/** Buang penanda format WA, rapetin spasi. TIDAK dipotong — lihat fingerprintRilis. */
export function normalisasiTeks(t) {
  return t.replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Nama resmi + alias jadi satu daftar, terpanjang dulu supaya nama pendek tidak menang. */
function daftarKandidat(units) {
  const k = []
  for (const u of units) {
    k.push({ unit: u, teks: u.name })
    for (const a of u.aliases || []) k.push({ unit: u, teks: a })
  }
  return k.sort((a, b) => b.teks.length - a.teks.length)
}

const esc = (t) => t.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Deteksi unit dari 4 BARIS PERTAMA saja — bukan seluruh badan.
 *
 * Lapis 1: kop resmi "POLSEK/SEKTOR <nama>"
 * Lapis 2: nama unit yang muncul paling awal (rilis gaya berita naratif,
 *          contoh: "FORPIMKA TEGALSARI GELAR NOBAR...")
 *
 * Dibatasi 4 baris karena 5 dari 67 rilis di file uji menyebut polsek lain di
 * uraian kegiatan atau tembusan ("jalan raya Singojuruh - Genteng"). Kalau
 * dicari di seluruh teks, rilis itu bisa masuk ke polsek yang salah — dan
 * salah atribusi tidak meninggalkan jejak, beda dengan yang tidak terbaca.
 * Diuji: nama unit yang muncul paling awal selalu pemiliknya, 0 kasus salah.
 */
export function deteksiUnitRilis(barisIsi, units) {
  const kepala = barisIsi.filter((b) => b.trim()).slice(0, 4).join('\n')
  const bersih = kepala.replace(/[*_~]/g, ' ').replace(/\s+/g, ' ').toUpperCase()
  const kandidat = daftarKandidat(units)

  const m = RE_PENANDA.exec(bersih)
  if (m) {
    const sesudah = bersih.slice(m.index + m[0].length - 1)
    for (const k of kandidat) {
      if (new RegExp(`^(\\s+\\S+){0,3}\\s+${esc(k.teks)}\\b`).test(sesudah)) {
        return { unit: k.unit, metode: 'header' }
      }
    }
  }

  let terpilih = null
  let posMin = Infinity
  for (const k of kandidat) {
    const i = bersih.search(new RegExp(`\\b${esc(k.teks)}\\b`))
    if (i >= 0 && i < posMin) {
      posMin = i
      terpilih = k.unit
    }
  }
  if (terpilih) return { unit: terpilih, metode: 'judul' }

  return null
}

/**
 * Cadangan terakhir: deteksi dari NAMA PENGIRIM.
 * Paling tidak dapat dipercaya — pengirim bisa berupa nomor HP, dan admin
 * kadang meneruskan rilis milik polsek lain.
 */
export function deteksiUnitDariPengirim(pengirim, units) {
  if (!pengirim) return null
  const s = pengirim.replace(/[*_~]/g, ' ').replace(/\s+/g, ' ').toUpperCase()
  for (const k of daftarKandidat(units)) {
    if (new RegExp(`\\b${esc(k.teks)}\\b`).test(s)) return k.unit
  }
  return null
}

/**
 * Kunci dedup pengganti URL. Teks di-hash UTUH, bukan potongan.
 *
 * Boilerplate rilis (POLRESTA / POLSEK / PERIHAL / KEPADA / DARI / TEMBUSAN)
 * makan ~280 karakter, dan perihal sering memakai template sama persis untuk
 * giat rutin. Kalimat pembeda ("Pada hari Kamis tanggal 23 Juli...") baru
 * muncul sekitar karakter ke-450. Dengan potongan 300 karakter, dua patroli
 * di hari berbeda terbaca sebagai satu — diuji: 7 dari 67 rilis hilang.
 */
export function fingerprintRilis({ tanggal, unitId, teks }) {
  const tgl = `${tanggal.y}-${String(tanggal.m).padStart(2, '0')}-${String(tanggal.d).padStart(2, '0')}`
  return crypto
    .createHash('sha256')
    .update(`${tgl}|${unitId}|${normalisasiTeks(teks)}`)
    .digest('hex')
}

export function analisisRilis(raw, { units, rayon = null, pemetaan = {} }) {
  const { pesan, stat } = parsePesanUtuh(raw)
  const rilis = []
  const perluTinjau = []
  const fp = new Set()
  let duplikatInternal = 0
  let dilewati = 0

  for (const p of pesan) {
    const isi = p.baris.join('\n')
    if (!isi.trim() || RE_MEDIA.test(isi)) { dilewati++; continue }

    const barisIsi = p.baris.filter((b) => b.trim())
    const jmlUrl = (isi.match(RE_URL_ISI) || []).length
    const adaStruktur = RE_STRUKTUR.test(isi)
    const adaPenanda = RE_PENANDA.test(isi.toUpperCase())

    // Berbentuk surat resmi tapi gagal jadi rilis -> layak ditinjau manusia.
    const suratLike = adaStruktur && jmlUrl < 2 && barisIsi.length >= 5

    let alasan = null
    if (barisIsi.length < MIN_BARIS || normalisasiTeks(isi).length < MIN_KARAKTER) {
      alasan = 'Terlalu pendek'
    } else if (!adaPenanda) {
      alasan = 'Tidak ada penanda POLSEK'
    } else if (jmlUrl >= 2 && !adaStruktur) {
      alasan = 'Kumpulan tautan, bukan rilis'
    }

    const kunci = kunciPesan({ tanggal: p.tanggal, teks: isi })
    const dipetakan = pemetaan[kunci]
      ? units.find((u) => String(u.id) === String(pemetaan[kunci]))
      : null

    let unit = null
    let metode = null
    if (dipetakan) {
      unit = dipetakan
      metode = 'manual'
      alasan = null // pemetaan manual mengalahkan semua penyaring
    } else if (!alasan) {
      const hd = deteksiUnitRilis(p.baris, units)
      unit = hd?.unit ?? null
      metode = hd?.metode ?? null
      if (!unit) {
        unit = deteksiUnitDariPengirim(p.pengirim, units)
        metode = unit ? 'pengirim' : null
      }
      if (!unit) alasan = 'Unit tidak terbaca'
    }

    if (!unit) {
      if (suratLike) {
        perluTinjau.push({
          kunci,
          tanggal: p.tanggal,
          pengirim: p.pengirim,
          alasan,
          baris: barisIsi.length,
          teks: isi.slice(0, 4000), // batas aman payload
        })
      } else {
        dilewati++
      }
      continue
    }

    const f = fingerprintRilis({ tanggal: p.tanggal, unitId: unit.id, teks: isi })
    if (fp.has(f)) { duplikatInternal++; continue }
    fp.add(f)

    rilis.push({
      unitId: unit.id, unitName: unit.name, tanggal: p.tanggal,
      pengirim: p.pengirim, rayon, metode, fingerprint: f,
    })
  }

  return {
    rilis,
    perluTinjau,
    stat: {
      ...stat,
      rilis: rilis.length,
      dariHeader: rilis.filter((r) => r.metode === 'header').length,
      dariJudul: rilis.filter((r) => r.metode === 'judul').length,
      dariPengirim: rilis.filter((r) => r.metode === 'pengirim').length,
      dariManual: rilis.filter((r) => r.metode === 'manual').length,
      perluTinjau: perluTinjau.length,
      duplikatInternal,
      dilewati,
    },
  }
}

/**
 * Kunci pesan TANPA unitId — dipakai client untuk menunjuk pesan mana yang
 * dipetakan manual. Server menghitung ulang kunci ini saat commit, jadi client
 * tidak bisa menyuntik pesan yang tidak ada di file.
 */
export function kunciPesan({ tanggal, teks }) {
  const tgl = `${tanggal.y}-${String(tanggal.m).padStart(2, '0')}-${String(tanggal.d).padStart(2, '0')}`
  return crypto.createHash('sha256').update(`${tgl}|${normalisasiTeks(teks)}`).digest('hex')
}
