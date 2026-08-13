import fs from 'node:fs'
import path from 'node:path'
import mammoth from 'mammoth'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------- parser export WhatsApp (teruji: 8.100+ baris, 0 error) ----------
const BULAN = { januari:1, februari:2, maret:3, april:4, mei:5, juni:6,
  juli:7, agustus:8, september:9, oktober:10, november:11, desember:12 }

const bersihkanAwal = (raw) => String(raw)
  .replace(/\r\n?/g, '\n')
  .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, '')
  .replace(/[\u00A0\u202F\u2007\u2009\t]/g, ' ')

// Penanda WA dibersihkan SETELAH bullet dideteksi. Kalau dibalik, bullet '*'
// ikut kehapus dan semua item hilang.
const stripMark = (s) => s.replace(/[*_~`]/g, '').replace(/ {2,}/g, ' ').trim()

const RE_IOS = /^\[(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?),?\s+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)\]\s*([^:]{1,60}?):\s?([\s\S]*)$/
const RE_ANDROID = /^(\d{1,2}\/\d{1,2}\/\d{2,4})[, ]+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)(?:\s*[APap][Mm])?\s+-\s+([^:]{1,60}?):\s?([\s\S]*)$/
const RE_AKHIR = /^(Demikian\s+kami\s+laporkan|Wassalamu|DUMM|Hormat\s+Kami)/i
const RE_SEKSI = /^([AB])\.\s*MEDIA\s+(ONLINE|SOSIAL)\b/i
const RE_KATEGORI = /^(\d{1,2})\.\s+(.+)$/
const RE_BULLET = /^[*\u2022\u00B7-]\s*(.*)$/

function pecahPesan(teks) {
  const pesan = []
  let aktif = null // WAJIB di luar loop: pesan bisa multi-baris
  for (const b of teks.split('\n')) {
    const m = RE_IOS.exec(b) || RE_ANDROID.exec(b)
    if (m) {
      if (aktif) pesan.push(aktif)
      aktif = { isi: [m[4]] }
    } else if (aktif) {
      aktif.isi.push(b) // baris kosong TIDAK me-reset konteks
    }
  }
  if (aktif) pesan.push(aktif)
  return pesan.map((p) => p.isi.join('\n'))
}

// Tanggal dari ISI laporan, bukan timestamp WA — laporan sering dikirim ulang
// berhari-hari setelah tanggal kontennya.
function tanggalDariIsi(isi) {
  const m = stripMark(isi.replace(/\n/g, ' '))
    .match(/Pada\s+Hari\s+\w+,?\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i)
  if (!m) return null
  const bln = BULAN[m[2].toLowerCase()]
  if (!bln) return null
  const p = (n) => String(n).padStart(2, '0')
  return `${m[3]}-${p(bln)}-${p(Number(m[1]))}`
}

const normUrl = (u) => String(u).trim().replace(/[.,;)\]]+$/, '').replace(/\/+$/, '')
const validUrl = (u) => { try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:' } catch { return false } }
const hashUrl = (u) => crypto.createHash('sha256').update(normUrl(u)).digest('hex')
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null } }

function parseLaporan(isi) {
  const tanggal = tanggalDariIsi(isi)
  if (!tanggal) return null
  const items = []
  let seksi = null, kategori = null, aktif = null

  const flush = () => {
    if (!aktif) return
    const mentah = aktif.buf.join(' ')   // URL diambil dari teks MENTAH:
    const ctx = aktif.ctx                // '_' di URL kehapus kalau distrip dulu
    aktif = null
    const teks = stripMark(mentah)
    if (!teks || /^NIHIL\.?$/i.test(teks)) return
    const urls = [...mentah.matchAll(/https?:\/\/[^\s<>"'*~`]+/gi)]
      .map((m) => normUrl(m[0])).filter(validUrl)
    if (!urls.length) return
    const judul = stripMark(mentah.slice(0, mentah.search(/https?:\/\//i)))
    if (judul) items.push({ tanggal, ...ctx, judul, url: urls[0] })
  }

  for (const b0 of isi.split('\n')) {
    const b = b0.trim()
    const bullet = RE_BULLET.exec(b)
    const polos = stripMark(b)
    if (RE_AKHIR.test(polos)) { flush(); break }
    const s = RE_SEKSI.exec(polos)
    if (s) { flush(); seksi = s[2].toUpperCase() === 'ONLINE' ? 'ONLINE' : 'SOSMED'; kategori = null; continue }
    if (bullet && seksi && kategori) { flush(); aktif = { buf: [bullet[1]], ctx: { kanalLapor: seksi, kategoriNama: kategori } }; continue }
    const k = RE_KATEGORI.exec(polos)
    if (k && seksi && !/^https?:/i.test(polos)) { flush(); kategori = k[2].trim(); continue }
    if (aktif && b) aktif.buf.push(b)
  }
  flush()
  return { tanggal, items }
}

// ---------- parser docx (tabel 6 kolom: NO|TANGGAL|SUMBER|KATEGORI|JUDUL|URL) ----------
const teksPolos = (html) => String(html).replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/[\u200B-\u200F\uFEFF]/g, '').replace(/[\u00A0\u202F]/g, ' ')
  .replace(/\s+/g, ' ').trim()

const KANAL_LAPOR = {
  'media online': 'ONLINE', 'online': 'ONLINE',
  'media sosial': 'SOSMED', 'media social': 'SOSMED',
  'sosial media': 'SOSMED', 'sosmed': 'SOSMED',
}

// Toleran ke typo: slash hilang ("07/072026"), pemisah titik/strip, spasi nyelip.
function parseTanggalTabel(raw) {
  const t = teksPolos(raw).replace(/\s/g, '')
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!m) m = t.match(/^(\d{2})[/.-](\d{2})(\d{4})$/)
  if (!m) return null
  const d = Number(m[1]), mo = Number(m[2])
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null
  const p = (n) => String(n).padStart(2, '0')
  return `${m[3]}-${p(mo)}-${p(d)}`
}

async function parseDocx(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  const baris = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1])
  const items = []
  const ditolak = []
  let terakhirTanggal = null   // baris tabel bisa terpotong antar halaman

  for (const tr of baris) {
    const sel = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1])
    if (sel.length < 6) { ditolak.push('kolom kurang dari 6'); continue }
    const [cNo, cTgl, cSum, cKat, cJud, cUrl] = sel

    // WAJIB teksPolos dulu sebelum kunci() — kalau HTML mentah yang dicocokkan,
    // '<p>Media Online</p>' jadi 'p media online p' dan tidak pernah cocok.
    if (kunci(teksPolos(cTgl)) === 'tanggal' || kunci(teksPolos(cNo)) === 'no') continue

    let tanggal = parseTanggalTabel(cTgl) ?? terakhirTanggal
    if (!tanggal) { ditolak.push('tanggal tidak terbaca'); continue }
    terakhirTanggal = tanggal

    const judul = teksPolos(cJud)
    const hrefs = [...cUrl.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((m) => m[1])
    const teksUrl = teksPolos(cUrl)
    const url = hrefs[0] || (validUrl(teksUrl) ? teksUrl : null)

    if (!judul) { ditolak.push('judul kosong'); continue }
    if (!url || !validUrl(url)) { ditolak.push(`url kosong: ${judul.slice(0, 40)}`); continue }

    items.push({
      tanggal,
      kanalLapor: KANAL_LAPOR[kunci(teksPolos(cSum))] ?? null,
      kategoriNama: teksPolos(cKat),
      judul,
      url: normUrl(url),
    })
  }
  return { items, ditolak }
}

// ---------- util ----------
const WIB = '+07:00'
const tglWib = (s) => new Date(`${s}T00:00:00.000${WIB}`)
const kunci = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const STOP = new Set('yang untuk dari dengan dalam pada akan telah sudah tidak juga saat usai hingga serta lebih masih agar bisa dapat tetap oleh atas para ini itu dan atau banyuwangi jatim jawa timur kabupaten kecamatan desa kembali jadi soal'.split(' '))
const tokenJudul = (s) => [...new Set(kunci(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w)))]
const jaccard = (a, b) => { const i = a.filter((x) => b.includes(x)).length; return i / (a.length + b.length - i) }

// ---------- main ----------
async function main() {
  const folder = process.argv[2]
  if (!folder) throw new Error('Pakai: node scripts/backfill-monitoring.mjs "path/folder-txt"')

  const semuaFile = fs.readdirSync(folder)
  const fileTxt = semuaFile.filter((f) => f.toLowerCase().endsWith('.txt'))
  const fileDocx = semuaFile.filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
  if (!fileTxt.length && !fileDocx.length) throw new Error(`Tidak ada .txt / .docx di ${folder}`)
  console.log(`file: ${fileTxt.length} txt, ${fileDocx.length} docx`)

  const perTanggal = new Map()
  const tambah = (it) => {
    const slot = perTanggal.get(it.tanggal) ?? new Map()
    slot.set(hashUrl(it.url), it)   // dedup dalam hari yang sama
    perTanggal.set(it.tanggal, slot)
  }

  let totalLaporan = 0
  for (const f of fileTxt) {
    const raw = bersihkanAwal(fs.readFileSync(path.join(folder, f), 'utf8'))
    for (const isi of pecahPesan(raw)) {
      if (!/Pemantauan\s+Media\s+Online/i.test(stripMark(isi.replace(/\n/g, ' ')))) continue
      const hasil = parseLaporan(isi)
      if (!hasil) continue
      totalLaporan++
      for (const it of hasil.items) tambah(it)
    }
  }

  for (const f of fileDocx) {
    const { items, ditolak } = await parseDocx(fs.readFileSync(path.join(folder, f)))
    for (const it of items) tambah(it)
    console.log(`  ${f}: ${items.length} item${ditolak.length ? `, ${ditolak.length} ditolak` : ''}`)
    if (ditolak.length) console.log('   ', ditolak.slice(0, 5))
  }

  console.log(`laporan WA terparse: ${totalLaporan} | tanggal unik total: ${perTanggal.size}`)

  // 2. peta kategori (kode + aliases) dan platform
  const kategoriRows = await prisma.monitoringKategori.findMany()
  if (!kategoriRows.length) throw new Error('MonitoringKategori kosong — jalankan seed dulu')
  const petaKategori = new Map()
  for (const k of kategoriRows) {
    petaKategori.set(kunci(k.nama), k.id)
    for (const a of (Array.isArray(k.aliases) ? k.aliases : [])) petaKategori.set(kunci(a), k.id)
  }
  const idSosialBudaya = kategoriRows.find((k) => k.kode === 'SOSIAL_BUDAYA')?.id

  const platforms = await prisma.platform.findMany({ select: { id: true, domain: true, category: true } })
  const kanalDariHost = (h) => {
    const p = platforms.find((x) => Array.isArray(x.domain)
      && x.domain.some((d) => h === d || h.endsWith(`.${d}`)))
    if (p) return { kanal: p.category === 'sosmed' ? 'SOSMED' : 'ONLINE', platformId: p.id }
    // fallback kalau Platform belum terdaftar
    const SOSMED = ['instagram.com','facebook.com','tiktok.com','twitter.com','x.com','youtube.com','threads.net']
    return { kanal: SOSMED.some((d) => h === d || h.endsWith(`.${d}`)) ? 'SOSMED' : 'ONLINE', platformId: null }
  }

  // 3. simpan per hari — sequential, BUKAN satu $transaction panjang
  //    (pool TiDB default 2 detik)
  let simpan = 0, lewat = 0, tanpaKategori = 0
  const domainStat = new Map()

  for (const tanggal of [...perTanggal.keys()].sort()) {
    const contentDate = tglWib(tanggal)
    const sesi = await prisma.monitoringSesi.upsert({
      where: { contentDate },
      update: {},
      create: { contentDate, state: 'final', finalizedAt: new Date() },
      select: { id: true },
    })

    let nOn = 0, nSo = 0
    for (const it of perTanggal.get(tanggal).values()) {
      const h = hostOf(it.url)
      if (!h) { lewat++; continue }
      const { kanal, platformId } = kanalDariHost(h)
      let kategoriId = petaKategori.get(kunci(it.kategoriNama))
      if (!kategoriId) { kategoriId = idSosialBudaya; tanpaKategori++ }

      try {
        await prisma.monitoringItem.create({
          data: {
            sesiId: sesi.id, kanal, kategoriId,
            judul: it.judul.slice(0, 2000), url: it.url, urlHash: hashUrl(it.url),
            sumber: h.slice(0, 120), platformId,
            sumberInput: 'IMPORT', isReviewed: true, urutan: nOn + nSo,
          },
        })
        kanal === 'ONLINE' ? nOn++ : nSo++
        simpan++
        const d = domainStat.get(h) ?? { kanal, n: 0, first: tanggal, last: tanggal }
        d.n++; if (tanggal < d.first) d.first = tanggal; if (tanggal > d.last) d.last = tanggal
        domainStat.set(h, d)
      } catch (e) {
        if (e.code === 'P2002') lewat++   // sudah ada (unique sesiId+urlHash)
        else throw e
      }
    }

    await prisma.monitoringSesi.update({
      where: { id: sesi.id },
      data: { totalOnline: nOn, totalSosmed: nSo },
    })
    process.stdout.write(`\r  ${tanggal}  online ${nOn} sosmed ${nSo}   `)
  }
  console.log(`\nitem tersimpan: ${simpan} | dilewati: ${lewat} | kategori tak dikenal: ${tanpaKategori}`)

  // 4. domain
  for (const [domain, d] of domainStat) {
    await prisma.monitoringDomain.upsert({
      where: { domain },
      update: { lastSeenAt: tglWib(d.last), totalItem: { increment: d.n } },
      create: { domain, kanal: d.kanal, firstSeenAt: tglWib(d.first), lastSeenAt: tglWib(d.last), totalItem: d.n },
    })
  }
  console.log(`domain: ${domainStat.size} baris`)

  // 5. klaster isu — dibanding hanya dalam jendela 3 hari, jadi bukan O(n^2) penuh
  const ambangRow = await prisma.appConfig.findUnique({ where: { key: 'monitoring.ambang_klaster' } })
  const ambang = Number(ambangRow?.value) || 0.18

  const semua = await prisma.monitoringItem.findMany({
    select: { id: true, judul: true, kanal: true, kategoriId: true, sesi: { select: { contentDate: true } } },
  })
  const rows = semua.map((r) => ({
    id: r.id, judul: r.judul, kanal: r.kanal, kategoriId: r.kategoriId.toString(),
    tgl: r.sesi.contentDate.toISOString().slice(0, 10), tok: tokenJudul(r.judul),
  })).sort((a, b) => a.tgl.localeCompare(b.tgl))

  const dipakai = new Set()
  let nIsu = 0
  for (let a = 0; a < rows.length; a++) {
    if (dipakai.has(a)) continue
    const grup = [rows[a]]; dipakai.add(a)
    for (let b = a + 1; b < rows.length; b++) {
      if (dipakai.has(b)) continue
      const beda = (Date.parse(rows[b].tgl) - Date.parse(rows[a].tgl)) / 864e5
      if (beda > 3) break
      if (jaccard(rows[a].tok, rows[b].tok) >= ambang) { grup.push(rows[b]); dipakai.add(b) }
    }
    if (grup.length < 2) continue

    const hitung = {}
    for (const g of grup) hitung[g.tgl] = (hitung[g.tgl] || 0) + 1
    const tglUrut = Object.keys(hitung).sort()
    const online = grup.filter((g) => g.kanal === 'ONLINE').length
    const sosmed = grup.length - online
    const nKategori = new Set(grup.map((g) => g.kategoriId)).size
    // Skor: jumlah sumber 40%, lintas kanal 25%, bertahan 20%, terbelah 15%
    const skor = Math.round(
      grup.length * 4 +
      (online > 0 && sosmed > 0 ? 25 : 0) +
      (tglUrut.length - 1) * 10 +
      (nKategori > 1 ? 15 : 0)
    )

    const isu = await prisma.monitoringIsu.create({
      data: {
        judul: grup[0].judul.slice(0, 2000),
        tokenJson: grup[0].tok,
        firstDate: tglWib(tglUrut[0]),
        lastDate: tglWib(tglUrut[tglUrut.length - 1]),
        totalItem: grup.length, totalOnline: online, totalSosmed: sosmed,
        kategoriCount: nKategori, hitungPerHari: hitung, skor,
      },
      select: { id: true },
    })
    await prisma.monitoringItem.updateMany({
      where: { id: { in: grup.map((g) => g.id) } },
      data: { isuId: isu.id },
    })
    nIsu++
  }
  console.log(`isu terbentuk: ${nIsu}`)
}

main()
  .catch((e) => { console.error('\n', e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())