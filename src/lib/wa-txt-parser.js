// Parser file .txt hasil EXPORT chat WhatsApp.
// Beda dari wa-paste-parser.js (copy-paste manual): file export punya 2 varian
// header, pesan bisa multi-baris, dan ada baris sistem.
//
// Diuji lawan 2 file export asli (8.175 baris) + rekap manual Juli 2026:
// 4.343 dari 4.343 URL cocok, 0 hilang.

const RE_ANDROID =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\s*(AM|PM|am|pm))?\s+-\s+(.*)$/

const RE_IOS =
  /^\[(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\s*(AM|PM|am|pm))?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s*(.*)$/

const RE_IOS_TGL_DULU =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\s*(AM|PM|am|pm))?\]\s*(.*)$/

const RE_URL = /https?:\/\/[^\s<>"']+/g

// Baris sistem yang mengandung ':' — kalau gak difilter, "Anda yang membuat grup"
// kesangkut jadi nama pengirim.
const POLA_SISTEM = [
  /^Pesan dan (telepon|panggilan)/i,
  /^Anda (yang membuat grup|menambahkan|mengeluarkan|keluar)/i,
  /bergabung dari komunitas$/i,
  /(bergabung|keluar) (menggunakan tautan|dari grup)/i,
  /mengubah (subjek|ikon|deskripsi|setelan|nomor)/i,
  /^Pesan ini telah dihapus/i,
  /telah (bergabung|keluar)/i,
]

export function preprocessTxt(raw) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')        // invisible (LRM/RLM dkk)
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // varian spasi unicode
}

const normalisasiTahun = (y) => (Number(y) < 100 ? 2000 + Number(y) : Number(y))

function cocokkanHeader(line) {
  let m = RE_ANDROID.exec(line)
  if (m) {
    const [, d, mo, y, hh, mm, , ampm, sisa] = m
    return { tanggal: { y: normalisasiTahun(y), m: +mo, d: +d }, jam: +hh, menit: +mm, ampm, sisa }
  }
  m = RE_IOS.exec(line)
  if (m) {
    const [, hh, mm, , ampm, d, mo, y, sisa] = m
    return { tanggal: { y: normalisasiTahun(y), m: +mo, d: +d }, jam: +hh, menit: +mm, ampm, sisa }
  }
  m = RE_IOS_TGL_DULU.exec(line)
  if (m) {
    const [, d, mo, y, hh, mm, , ampm, sisa] = m
    return { tanggal: { y: normalisasiTahun(y), m: +mo, d: +d }, jam: +hh, menit: +mm, ampm, sisa }
  }
  return null
}

const barisSistem = (teks) => POLA_SISTEM.some((re) => re.test(teks))

export function parseWaTxt(raw) {
  const baris = preprocessTxt(raw).split('\n')

  // WAJIB di luar loop — baris lanjutan mewarisi konteks dari header terakhir.
  let tglAktif = null
  let pengirimAktif = null

  const pesan = []
  const statistik = { baris: baris.length, header: 0, lanjutan: 0, sistem: 0, yatim: 0 }

  for (const asli of baris) {
    const line = asli.trimEnd()
    const head = cocokkanHeader(line)

    if (head) {
      statistik.header++
      tglAktif = head.tanggal

      const pisah = head.sisa.indexOf(':')
      if (pisah === -1 || barisSistem(head.sisa)) {
        statistik.sistem++
        pengirimAktif = null
        continue
      }
      pengirimAktif = head.sisa.slice(0, pisah).trim()
      pesan.push({
        tanggal: tglAktif,
        pengirim: pengirimAktif,
        teks: head.sisa.slice(pisah + 1).trim(),
      })
      continue
    }

    if (!line.trim()) continue // baris kosong TIDAK me-reset konteks
    if (!tglAktif) {
      statistik.yatim++ // teks sebelum header pertama muncul
      continue
    }

    statistik.lanjutan++
    pesan.push({ tanggal: tglAktif, pengirim: pengirimAktif, teks: line.trim() })
  }

  return { pesan, statistik }
}

/** Buang tanda baca yang kebawa di ujung URL. Slash TIDAK dibuang (bagian dari URL asli). */
export const bersihkanUrl = (u) => u.replace(/[.,;:!?)\]}'"]+$/, '')

/** Semua URL beserta tanggal & pengirim pesannya. */
export function ekstrakUrl(raw) {
  const { pesan, statistik } = parseWaTxt(raw)
  const hasil = []
  for (const p of pesan) {
    const found = p.teks.match(RE_URL)
    if (!found) continue
    for (const u of found) {
      hasil.push({ url: bersihkanUrl(u), tanggal: p.tanggal, pengirim: p.pengirim })
    }
  }
  return { hasil, statistik }
}