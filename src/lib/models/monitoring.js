import prisma from '@/lib/prisma'
import { getDayRange, getMonthRange } from '@/lib/date-helpers'
import crypto from 'node:crypto'
import { saranKategori } from '@/lib/monitoring/klasifikasi'
import Mustache from 'mustache'

Mustache.escape = (text) => text

// Fungsi murni pemanggil Prisma. TIDAK tahu apa-apa soal HTTP/auth.
// Semua BigInt WAJIB di-.toString() sebelum keluar dari layer ini, karena
// BigInt tidak bisa di-pass Server Component -> Client Component.

const AMBANG_CONFIDENCE_DEFAULT = 60

function angka(v) {
  return typeof v === 'bigint' ? Number(v) : (v ?? 0)
}

function tanggalWib(date) {
  const geser = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${geser.getUTCFullYear()}-${p(geser.getUTCMonth() + 1)}-${p(geser.getUTCDate())}`
}

// Ambil id sesi dalam rentang, sekalian peta id -> tanggal WIB.
// Dipakai supaya agregasi item bisa di-scope ke sesi yang relevan saja
// (WHERE sesiId IN (...)), bukan memindai seluruh tabel item.
async function sesiDalamRentang(mulai, sampai) {
  const rows = await prisma.monitoringSesi.findMany({
    where: { contentDate: { gte: mulai, lte: sampai } },
    select: { id: true, contentDate: true },
    orderBy: { contentDate: 'asc' },
  })
  const petaTanggal = new Map(rows.map((r) => [r.id, tanggalWib(r.contentDate)]))
  return { ids: rows.map((r) => r.id), petaTanggal }
}

async function ambangConfidence() {
  const row = await prisma.appConfig.findUnique({
    where: { key: 'monitoring.ambang_confidence' },
  })
  const n = Number(row?.value)
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : AMBANG_CONFIDENCE_DEFAULT
}

// ---------------------------------------------------------------------
// Kartu 1-4: ringkasan hari ini
// ---------------------------------------------------------------------
export async function getRingkasanHariIni() {
  const { startOfDay, endOfDay } = getDayRange()
  const ambang = await ambangConfidence()

  const sesi = await prisma.monitoringSesi.findFirst({
    where: { contentDate: { gte: startOfDay, lte: endOfDay } },
    select: {
      id: true,
      state: true,
      totalOnline: true,
      totalSosmed: true,
      finalizedAt: true,
    },
  })

  const [perluReview, dariCrawler, antrean, sumberTerakhir] = await Promise.all([
    sesi
      ? prisma.monitoringItem.count({
          where: {
            sesiId: sesi.id,
            isReviewed: false,
            OR: [{ confidence: null }, { confidence: { lt: ambang } }],
          },
        })
      : Promise.resolve(0),
    sesi
      ? prisma.monitoringItem.count({
          where: { sesiId: sesi.id, sumberInput: 'CRAWLER' },
        })
      : Promise.resolve(0),
    prisma.monitoringKandidat.count({ where: { status: 'baru' } }),
    prisma.monitoringSumber.findFirst({
      where: { lastRunAt: { not: null } },
      orderBy: { lastRunAt: 'desc' },
      select: { lastRunAt: true },
    }),
  ])

  const totalOnline = sesi?.totalOnline ?? 0
  const totalSosmed = sesi?.totalSosmed ?? 0

  return {
    adaSesi: Boolean(sesi),
    sesiId: sesi?.id ?? null,
    state: sesi?.state ?? null,
    totalItem: totalOnline + totalSosmed,
    totalOnline,
    totalSosmed,
    perluReview,
    dariCrawler,
    antreanBaru: antrean,
    ditarikPada: sumberTerakhir?.lastRunAt?.toISOString() ?? null,
  }
}

// ---------------------------------------------------------------------
// Kartu 5: isu paling disorot
// ---------------------------------------------------------------------
export async function getIsuPalingDisorot({ hari = 7, batas = 5 } = {}) {
  const { endOfDay } = getDayRange()
  const mulai = new Date(endOfDay.getTime() - (hari - 1) * 24 * 60 * 60 * 1000)

  const rows = await prisma.monitoringIsu.findMany({
    where: { lastDate: { gte: mulai } },
    orderBy: [{ skor: 'desc' }, { lastDate: 'desc' }],
    take: batas,
    select: {
      id: true,
      judul: true,
      firstDate: true,
      lastDate: true,
      totalItem: true,
      totalOnline: true,
      totalSosmed: true,
      kategoriCount: true,
      hitungPerHari: true,
      skor: true,
    },
  })

  return rows.map((r) => {
    const hitung = r.hitungPerHari && typeof r.hitungPerHari === 'object' ? r.hitungPerHari : {}
    const urut = Object.keys(hitung).sort()
    const terakhir = urut.length ? Number(hitung[urut[urut.length - 1]]) || 0 : 0
    const sebelumnya = urut.length > 1 ? Number(hitung[urut[urut.length - 2]]) || 0 : 0

    const lamaHari =
      Math.round((r.lastDate.getTime() - r.firstDate.getTime()) / (24 * 60 * 60 * 1000)) + 1

    return {
      id: r.id.toString(),
      judul: r.judul,
      totalItem: r.totalItem,
      totalOnline: r.totalOnline,
      totalSosmed: r.totalSosmed,
      lamaHari,
      skor: r.skor,
      // Badge diturunkan di sini, bukan disimpan, supaya "naik" selalu
      // relatif terhadap data terbaru tanpa perlu update baris.
      naik: terakhir > sebelumnya && terakhir > 0,
      terbelah: r.kategoriCount > 1,
      medsosSaja: r.totalOnline === 0 && r.totalSosmed > 0,
      belumDiMedsos: r.totalSosmed === 0 && r.totalOnline > 0,
    }
  })
}

// ---------------------------------------------------------------------
// Kartu 6: media paling sering memberitakan
// ---------------------------------------------------------------------
export async function getMediaTeratas({ batas = 6 } = {}) {
  const { startOfMonth, endOfMonth } = getMonthRange()
  const { ids } = await sesiDalamRentang(startOfMonth, endOfMonth)

  if (ids.length === 0) {
    return { daftar: [], totalDomain: 0, domainBaru: 0 }
  }

  const [grup, totalDomain, domainBaru] = await Promise.all([
    prisma.monitoringItem.groupBy({
      by: ['sumber'],
      where: { sesiId: { in: ids }, kanal: 'ONLINE', sumber: { not: null } },
      _count: { sumber: true },
      orderBy: { _count: { sumber: 'desc' } },
      take: batas,
    }),
    prisma.monitoringDomain.count({ where: { kanal: 'ONLINE' } }),
    prisma.monitoringDomain.count({
      where: { kanal: 'ONLINE', firstSeenAt: { gte: startOfMonth } },
    }),
  ])

  return {
    daftar: grup.map((g) => ({ domain: g.sumber, jumlah: angka(g._count.sumber) })),
    totalDomain,
    domainBaru,
  }
}

// ---------------------------------------------------------------------
// Kartu 7: sentimen pemberitaan Polri
// ---------------------------------------------------------------------
export async function getSentimenPolri({ hari = 30 } = {}) {
  const { endOfDay } = getDayRange()
  const mulai = new Date(endOfDay.getTime() - (hari - 1) * 24 * 60 * 60 * 1000)

  const kategori = await prisma.monitoringKategori.findMany({
    where: { subjek: 'POLRI' },
    select: { id: true, sentimen: true },
  })
  if (kategori.length === 0) return { deret: [], positif: 0, negatif: 0, rasio: null }

  const petaSentimen = new Map(kategori.map((k) => [k.id.toString(), k.sentimen]))
  const { ids, petaTanggal } = await sesiDalamRentang(mulai, endOfDay)
  if (ids.length === 0) return { deret: [], positif: 0, negatif: 0, rasio: null }

  const grup = await prisma.monitoringItem.groupBy({
    by: ['sesiId', 'kategoriId'],
    where: { sesiId: { in: ids }, kategoriId: { in: kategori.map((k) => k.id) } },
    _count: { _all: true },
  })

  const perHari = new Map()
  for (const g of grup) {
    const tgl = petaTanggal.get(g.sesiId)
    if (!tgl) continue
    const sentimen = petaSentimen.get(g.kategoriId.toString())
    const slot = perHari.get(tgl) ?? { tanggal: tgl, positif: 0, negatif: 0 }
    if (sentimen === 'POSITIF') slot.positif += angka(g._count._all)
    else if (sentimen === 'NEGATIF') slot.negatif += angka(g._count._all)
    perHari.set(tgl, slot)
  }

  // Hari tanpa sesi tetap dimunculkan sebagai nol, biar grafik tidak bohong
  // soal kerapatan data.
  const deret = []
  for (const tgl of petaTanggal.values()) {
    deret.push(perHari.get(tgl) ?? { tanggal: tgl, positif: 0, negatif: 0 })
  }
  deret.sort((a, b) => a.tanggal.localeCompare(b.tanggal))

  const positif = deret.reduce((a, d) => a + d.positif, 0)
  const negatif = deret.reduce((a, d) => a + d.negatif, 0)
  const total = positif + negatif

  return {
    deret,
    positif,
    negatif,
    rasio: total > 0 ? Math.round((positif / total) * 100) : null,
  }
}

// ---------------------------------------------------------------------
// Halaman daftar sesi monitoring
// ---------------------------------------------------------------------

// Daftar bulan yang punya data, buat isi dropdown. Sesi jumlahnya ratusan,
// jadi aman diambil kolom tanggalnya saja lalu dikelompokkan di JS.
export async function getBulanTersedia() {
  const rows = await prisma.monitoringSesi.findMany({
    select: { contentDate: true },
    orderBy: { contentDate: 'desc' },
  })
  const set = new Set(rows.map((r) => tanggalWib(r.contentDate).slice(0, 7)))
  return [...set].sort().reverse()
}

// Satu bulan maksimal 31 baris, jadi tidak perlu pagination — filter bulannya
// sendiri yang membatasi. Hari tanpa sesi tetap dikembalikan supaya hari
// terlewat kelihatan.
export async function getSesiPerBulan(bulan) {
  if (!/^\d{4}-\d{2}$/.test(bulan)) throw new Error('Format bulan tidak valid')
  const [y, m] = bulan.split('-').map(Number)

  const mulai = new Date(`${bulan}-01T00:00:00.000+07:00`)
  const jumlahHari = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const selesai = new Date(
    `${bulan}-${String(jumlahHari).padStart(2, '0')}T23:59:59.999+07:00`
  )

  const sesi = await prisma.monitoringSesi.findMany({
    where: { contentDate: { gte: mulai, lte: selesai } },
    select: {
      id: true,
      contentDate: true,
      state: true,
      totalOnline: true,
      totalSosmed: true,
      finalizedAt: true,
    },
    orderBy: { contentDate: 'desc' },
  })

  // Hitung item perlu review sekali untuk semua sesi bulan itu, bukan
  // per baris (hindari N+1).
  let petaReview = new Map()
  if (sesi.length > 0) {
    const grup = await prisma.monitoringItem.groupBy({
      by: ['sesiId'],
      where: { sesiId: { in: sesi.map((s) => s.id) }, isReviewed: false },
      _count: { _all: true },
    })
    petaReview = new Map(grup.map((g) => [g.sesiId, angka(g._count._all)]))
  }

  const petaSesi = new Map(sesi.map((s) => [tanggalWib(s.contentDate), s]))

  const hasil = []
  for (let d = jumlahHari; d >= 1; d--) {
    const tanggal = `${bulan}-${String(d).padStart(2, '0')}`
    const s = petaSesi.get(tanggal)
    hasil.push({
      tanggal,
      adaSesi: Boolean(s),
      sesiId: s?.id ?? null,
      state: s?.state ?? null,
      totalOnline: s?.totalOnline ?? 0,
      totalSosmed: s?.totalSosmed ?? 0,
      totalItem: (s?.totalOnline ?? 0) + (s?.totalSosmed ?? 0),
      perluReview: s ? (petaReview.get(s.id) ?? 0) : 0,
    })
  }

  const ringkas = {
    jumlahSesi: sesi.length,
    jumlahHari,
    totalOnline: sesi.reduce((a, s) => a + s.totalOnline, 0),
    totalSosmed: sesi.reduce((a, s) => a + s.totalSosmed, 0),
    totalReview: [...petaReview.values()].reduce((a, b) => a + b, 0),
  }

  return { hasil, ringkas }
}


// ---------------------------------------------------------------------
// Detail sesi + operasi item
// ---------------------------------------------------------------------

const SOSMED_BAWAAN = ['instagram.com','facebook.com','tiktok.com','twitter.com','x.com','youtube.com','threads.net']

export function normalizeUrlMonitoring(u) {
  return String(u).trim().replace(/[.,;)\]]+$/, '').replace(/\/+$/, '')
}

export function isUrlAman(u) {
  try {
    const p = new URL(u)
    return p.protocol === 'http:' || p.protocol === 'https:'
  } catch {
    return false
  }
}

const hashUrl = (u) => crypto.createHash('sha256').update(normalizeUrlMonitoring(u)).digest('hex')
const hostUrl = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null } }

async function konteksKlasifikasi() {
  const [kategori, rules, platforms] = await Promise.all([
    prisma.monitoringKategori.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, kode: true, nama: true, sortOrder: true },
    }),
    prisma.monitoringRule.findMany({
      where: { isActive: true },
      select: { keyword: true, bobot: true, kategoriId: true, kanal: true },
    }),
    prisma.platform.findMany({ select: { id: true, domain: true, category: true } }),
  ])
  return { kategori, rules, platforms }
}

// Kanal SELALU diturunkan dari domain di server — tidak pernah percaya
// nilai kanal yang dikirim klien.
function turunkanKanal(url, platforms) {
  const h = hostUrl(url)
  if (!h) return { kanal: null, platformId: null, sumber: null }
  const p = platforms.find(
    (x) => Array.isArray(x.domain) && x.domain.some((d) => h === d || h.endsWith(`.${d}`))
  )
  if (p) return { kanal: p.category === 'sosmed' ? 'SOSMED' : 'ONLINE', platformId: p.id, sumber: h }
  const sos = SOSMED_BAWAAN.some((d) => h === d || h.endsWith(`.${d}`))
  return { kanal: sos ? 'SOSMED' : 'ONLINE', platformId: null, sumber: h }
}

export async function getSesiDetail(id) {
  const sesi = await prisma.monitoringSesi.findUnique({
    where: { id: String(id) },
    select: {
      id: true, contentDate: true, state: true,
      totalOnline: true, totalSosmed: true, finalizedAt: true,
    },
  })
  if (!sesi) return null

  const [items, kategori] = await Promise.all([
    prisma.monitoringItem.findMany({
      where: { sesiId: sesi.id },
      orderBy: [{ kanal: 'asc' }, { urutan: 'asc' }, { id: 'asc' }],
      select: {
        id: true, kanal: true, kategoriId: true, judul: true, url: true,
        sumber: true, confidence: true, isReviewed: true, sumberInput: true,
      },
    }),
    prisma.monitoringKategori.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, kode: true, nama: true, sortOrder: true },
    }),
  ])

  return {
    id: sesi.id,
    tanggal: tanggalWib(sesi.contentDate),
    state: sesi.state,
    totalOnline: sesi.totalOnline,
    totalSosmed: sesi.totalSosmed,
    kategori: kategori.map((k) => ({
      id: k.id.toString(), kode: k.kode, nama: k.nama, sortOrder: k.sortOrder,
    })),
    items: items.map((i) => ({
      id: i.id.toString(),
      kanal: i.kanal,
      kategoriId: i.kategoriId.toString(),
      judul: i.judul,
      url: i.url,
      sumber: i.sumber,
      confidence: i.confidence,
      isReviewed: i.isReviewed,
      sumberInput: i.sumberInput,
    })),
  }
}

export async function buatSesiMonitoring(tanggal) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Format tanggal tidak valid')
  const contentDate = new Date(`${tanggal}T00:00:00.000+07:00`)
  if (Number.isNaN(contentDate.getTime())) throw new Error('Tanggal tidak valid')

  const ada = await prisma.monitoringSesi.findUnique({
    where: { contentDate }, select: { id: true },
  })
  if (ada) return ada.id

  const sesi = await prisma.monitoringSesi.create({
    data: { contentDate, state: 'draft' }, select: { id: true },
  })
  return sesi.id
}

async function sinkronTotal(sesiId) {
  const grup = await prisma.monitoringItem.groupBy({
    by: ['kanal'], where: { sesiId }, _count: { _all: true },
  })
  const on = angka(grup.find((g) => g.kanal === 'ONLINE')?._count._all)
  const so = angka(grup.find((g) => g.kanal === 'SOSMED')?._count._all)
  await prisma.monitoringSesi.update({
    where: { id: sesiId }, data: { totalOnline: on, totalSosmed: so },
  })
}

// Dipakai input manual DAN paste bulk. Mengembalikan ringkasan, bukan throw,
// supaya sebagian baris gagal tidak menggagalkan seluruhnya.
export async function tambahItemMonitoring(sesiId, daftar, { sumberInput = 'MANUAL' } = {}) {
  const sesi = await prisma.monitoringSesi.findUnique({
    where: { id: String(sesiId) }, select: { id: true, state: true },
  })
  if (!sesi) throw new Error('Sesi tidak ditemukan')
  if (sesi.state === 'final') throw new Error('Sesi sudah final, buka kembali dulu untuk mengubah')

  const { kategori, rules, platforms } = await konteksKlasifikasi()
  const idDefault = kategori.find((k) => k.kode === 'SOSIAL_BUDAYA')?.id ?? kategori[0]?.id
  const ambang = await ambangConfidence()

  const terakhir = await prisma.monitoringItem.findFirst({
    where: { sesiId: sesi.id }, orderBy: { urutan: 'desc' }, select: { urutan: true },
  })
  let urutan = (terakhir?.urutan ?? -1) + 1

  const hasil = { masuk: 0, duplikat: 0, gagal: [] }

  for (const baris of daftar) {
    const url = normalizeUrlMonitoring(baris.url ?? '')
    const judul = String(baris.judul ?? '').trim().slice(0, 2000)

    if (!isUrlAman(url)) { hasil.gagal.push({ alasan: 'URL tidak valid', teks: judul.slice(0, 60) || url.slice(0, 60) }); continue }
    if (!judul) { hasil.gagal.push({ alasan: 'Judul kosong', teks: url.slice(0, 60) }); continue }

    const { kanal, platformId, sumber } = turunkanKanal(url, platforms)
    if (!kanal) { hasil.gagal.push({ alasan: 'Domain tidak terbaca', teks: url.slice(0, 60) }); continue }

    // Kategori pilihan operator dihormati, tapi diverifikasi ulang di server.
    let kategoriId = null
    let confidence = null
    const dipilih = baris.kategoriId
      ? kategori.find((k) => k.id.toString() === String(baris.kategoriId))
      : null

    if (dipilih) {
      kategoriId = dipilih.id
      confidence = 100
    } else {
      const saran = saranKategori(judul, sumber, rules, { kanal })
      confidence = saran.confidence
      kategoriId = saran.confidence >= ambang && saran.kategoriId
        ? kategori.find((k) => k.id.toString() === saran.kategoriId)?.id ?? idDefault
        : idDefault
    }

    try {
      await prisma.monitoringItem.create({
        data: {
          sesiId: sesi.id, kanal, kategoriId, judul, url,
          urlHash: hashUrl(url), sumber: sumber?.slice(0, 120) ?? null, platformId,
          sumberInput, confidence,
          isReviewed: Boolean(dipilih),
          urutan: urutan++,
        },
      })
      hasil.masuk++

      if (sumber) {
        await prisma.monitoringDomain.upsert({
          where: { domain: sumber },
          update: { lastSeenAt: new Date(), totalItem: { increment: 1 } },
          create: { domain: sumber, kanal, totalItem: 1 },
        })
      }
    } catch (e) {
      if (e.code === 'P2002') hasil.duplikat++
      else throw e
    }
  }

  await sinkronTotal(sesi.id)
  return hasil
}

export async function ubahKategoriItem(itemId, kategoriId) {
  const kat = await prisma.monitoringKategori.findUnique({
    where: { id: BigInt(kategoriId) }, select: { id: true },
  })
  if (!kat) throw new Error('Kategori tidak dikenal')

  await prisma.monitoringItem.update({
    where: { id: BigInt(itemId) },
    data: { kategoriId: kat.id, isReviewed: true, confidence: 100 },
  })
}

export async function hapusItemMonitoring(itemId) {
  const item = await prisma.monitoringItem.delete({
    where: { id: BigInt(itemId) }, select: { sesiId: true },
  })
  await sinkronTotal(item.sesiId)
}

export async function ubahStateSesi(sesiId, state) {
  if (!['draft', 'final'].includes(state)) throw new Error('State tidak dikenal')
  await prisma.monitoringSesi.update({
    where: { id: String(sesiId) },
    data: { state, finalizedAt: state === 'final' ? new Date() : null },
  })
}


// ---------------------------------------------------------------------
// Dipanggil sekali dari dashboard page.js
// ---------------------------------------------------------------------
export async function getMonitoringOverview({ isuHari = 7 } = {}) {
  const [ringkasan, isu, media, sentimen] = await Promise.all([
    getRingkasanHariIni(),
    getIsuPalingDisorot({ hari: isuHari }),
    getMediaTeratas(),
    getSentimenPolri(),
  ])

  return { ringkasan, isu, media, sentimen }
}

// ---------------------------------------------------------------------
// Generate laporan monitoring
// ---------------------------------------------------------------------

// Format monitoring ditandai config.jenis === 'monitoring'. Format lama tanpa
// field ini tetap dianggap 'rekap' — tidak perlu migrasi data.
export async function getFormatMonitoring() {
  const rows = await prisma.reportFormat.findMany({
    where: { isActive: true },
    select: { id: true, name: true, config: true },
    orderBy: { name: 'asc' },
  })
  return rows
    .filter((r) => r.config && typeof r.config === 'object' && r.config.jenis === 'monitoring')
    .map((r) => ({ id: r.id, name: r.name }))
}

export async function generateLaporanMonitoring(sesiId, formatId) {
  const [sesi, format] = await Promise.all([
    prisma.monitoringSesi.findUnique({
      where: { id: String(sesiId) },
      select: { id: true, contentDate: true, totalOnline: true, totalSosmed: true },
    }),
    prisma.reportFormat.findUnique({
      where: { id: String(formatId) },
      select: { id: true, name: true, template: true, config: true },
    }),
  ])
  if (!sesi) throw new Error('Sesi tidak ditemukan')
  if (!format) throw new Error('Format tidak ditemukan')
  if (format.config?.jenis !== 'monitoring') throw new Error('Format ini bukan format monitoring')

  const [items, kategori] = await Promise.all([
    prisma.monitoringItem.findMany({
      where: { sesiId: sesi.id },
      orderBy: [{ urutan: 'asc' }, { id: 'asc' }],
      select: { kanal: true, kategoriId: true, judul: true, url: true },
    }),
    prisma.monitoringKategori.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, kode: true, nama: true, sortOrder: true },
    }),
  ])

  const cfg = format.config ?? {}
  const tampilkanNihil = cfg.tampilkanNihil !== false
  const dikecualikan = Array.isArray(cfg.kategoriDikecualikan) ? cfg.kategoriDikecualikan : []
  const kanalAktif = Array.isArray(cfg.kanalAktif) && cfg.kanalAktif.length
    ? cfg.kanalAktif
    : ['ONLINE', 'SOSMED']

  const katPakai = kategori.filter((k) => !dikecualikan.includes(k.kode))

  const NAMA_KANAL = { ONLINE: 'MEDIA ONLINE', SOSMED: 'MEDIA SOSIAL' }
  const kanal = []
  kanalAktif.forEach((kode, idx) => {
    const daftarKategori = []
    let nomor = 0
    for (const k of katPakai) {
      const isi = items.filter(
        (i) => i.kanal === kode && i.kategoriId.toString() === k.id.toString()
      )
      if (isi.length === 0 && !tampilkanNihil) continue
      nomor++
      daftarKategori.push({
        nomor,
        namaKategori: k.nama,
        nihil: isi.length === 0,
        jumlah: isi.length,
        items: isi.map((i) => ({ judul: i.judul, url: i.url })),
      })
    }
    kanal.push({
      huruf: String.fromCharCode(65 + idx),
      nama: NAMA_KANAL[kode] ?? kode,
      kategori: daftarKategori,
      total: items.filter((i) => i.kanal === kode).length,
    })
  })

  const tanggalIndo = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(sesi.contentDate)

  const pejabat = await prisma.appConfig.findUnique({ where: { key: 'nama_kapolresta' } })

  const context = {
    tanggalIndo,
    tanggal: tanggalWib(sesi.contentDate),
    totalOnline: sesi.totalOnline,
    totalSosmed: sesi.totalSosmed,
    totalItem: sesi.totalOnline + sesi.totalSosmed,
    pejabat: pejabat?.value ?? '',
    kanal,
  }

  return { teks: Mustache.render(format.template, context), namaFormat: format.name }
}

// ---------------------------------------------------------------------
// Antrean kandidat
// ---------------------------------------------------------------------

export async function tarikKandidat({ sumberId = null, batasSumber = 25 } = {}) {
  const { tarikSatuSumber } = await import('@/lib/monitoring/crawler')

  const sumber = await prisma.monitoringSumber.findMany({
    where: {
      isActive: true,
      jenis: { in: ['RSS', 'GNEWS'] },
      ...(sumberId ? { id: BigInt(sumberId) } : {}),
    },
    take: sumberId ? 1 : batasSumber,
    orderBy: { lastRunAt: 'asc' },
  })
  if (sumber.length === 0) return { sumber: 0, baru: 0, duplikat: 0 }

  const { rules, platforms, kategori } = await konteksKlasifikasi()
  const petaKode = new Map(kategori.map((k) => [k.id.toString(), k.kode]))

  let baru = 0
  let duplikat = 0
  const kwRow = await prisma.appConfig.findUnique({
    where: { key: 'monitoring.keyword_relevansi' },
  })
  const keyword = kwRow?.value
    ? kwRow.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : undefined

  // Sumber diproses berurutan, bukan Promise.all — kalau 25 feed ditarik
  // sekaligus, koneksi pool ikut terbebani saat menulis hasilnya.
  for (const s of sumber) {
    let status = 'ok'
    try {
      const { kandidat, status: st } = await tarikSatuSumber(s, keyword)
      status = st
      for (const k of kandidat) {
        const urlHash = hashUrl(k.url)

        // Sudah pernah masuk laporan? Jangan tawarkan lagi.
        const sudahJadiItem = await prisma.monitoringItem.findFirst({
          where: { urlHash }, select: { id: true },
        })
        if (sudahJadiItem) { duplikat++; continue }

        const { kanal } = turunkanKanal(k.url, platforms)
        const saran = saranKategori(k.judul, k.sumberNama, rules, { kanal })

        try {
          await prisma.monitoringKandidat.create({
            data: {
              sumberId: s.id,
              judul: k.judul,
              url: k.url,
              urlHash,
              terbitAt: k.terbitAt,
              kanal: kanal ?? 'ONLINE',
              sumberNama: k.sumberNama,
              saranKode: saran.kategoriId ? (petaKode.get(saran.kategoriId) ?? null) : null,
              confidence: saran.confidence,
            },
          })
          baru++
        } catch (e) {
          if (e.code === 'P2002') duplikat++
          else throw e
        }
      }
    } catch (e) {
      status = `error: ${e.message}`.slice(0, 200)
    }

    await prisma.monitoringSumber.update({
      where: { id: s.id },
      data: { lastRunAt: new Date(), lastStatus: status.slice(0, 200) },
    })
  }

  return { sumber: sumber.length, baru, duplikat }
}

// Daftar sumber aktif untuk ditarik satu per satu dari klien — supaya tiap
// permintaan pendek dan tidak kena batas waktu serverless.
export async function getSumberAktif() {
  const rows = await prisma.monitoringSumber.findMany({
    where: { isActive: true, jenis: { in: ['RSS', 'GNEWS'] } },
    orderBy: [{ jenis: 'asc' }, { nama: 'asc' }],
    select: { id: true, nama: true, jenis: true },
  })
  return rows.map((r) => ({ id: r.id.toString(), nama: r.nama, jenis: r.jenis }))
}

export async function getKandidat({ page = 1, limit = 25, kanal = null } = {}) {
  const skip = (Math.max(1, page) - 1) * limit
  const where = { status: 'baru', ...(kanal ? { kanal } : {}) }

  const [rows, total, kategori] = await Promise.all([
    prisma.monitoringKandidat.findMany({
      where, skip, take: limit,
      orderBy: [{ terbitAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, judul: true, url: true, terbitAt: true, kanal: true,
        sumberNama: true, saranKode: true, confidence: true,
        sumber: { select: { jenis: true, nama: true } },
      },
    }),
    prisma.monitoringKandidat.count({ where }),
    prisma.monitoringKategori.findMany({
      where: { isActive: true }, orderBy: { sortOrder: 'asc' },
      select: { id: true, kode: true, nama: true, sortOrder: true },
    }),
  ])

  const domainDikenal = new Set(
    (await prisma.monitoringDomain.findMany({ select: { domain: true } })).map((d) => d.domain)
  )

  return {
    data: rows.map((r) => ({
      id: r.id.toString(),
      judul: r.judul,
      url: r.url,
      kanal: r.kanal,
      sumberNama: r.sumberNama,
      jenisSumber: r.sumber?.jenis ?? null,
      saranKode: r.saranKode,
      confidence: r.confidence,
      terbitAt: r.terbitAt?.toISOString() ?? null,
      domainBaru: r.sumberNama ? !domainDikenal.has(r.sumberNama) : false,
    })),
    kategori: kategori.map((k) => ({
      id: k.id.toString(), kode: k.kode, nama: k.nama, sortOrder: k.sortOrder,
    })),
    pagination: { page, limit, total, totalPage: Math.ceil(total / limit) },
  }
}

// Kandidat terpilih dipindah jadi item sesi. Judul & URL diambil ULANG dari
// tabel kandidat, bukan dari yang dikirim klien.
export async function ambilKandidat(sesiId, daftarId, petaKategori = {}) {
  const ids = daftarId.map((x) => BigInt(x))
  const rows = await prisma.monitoringKandidat.findMany({
    where: { id: { in: ids }, status: 'baru' },
    select: { id: true, judul: true, url: true, saranKode: true },
  })
  if (rows.length === 0) return { masuk: 0, duplikat: 0, gagal: [] }

  const kategori = await prisma.monitoringKategori.findMany({ select: { id: true, kode: true } })
  const petaKode = new Map(kategori.map((k) => [k.kode, k.id]))

  const daftar = rows.map((r) => {
    const kodeDipilih = petaKategori[r.id.toString()] ?? r.saranKode
    return {
      judul: r.judul,
      url: r.url,
      kategoriId: kodeDipilih ? (petaKode.get(kodeDipilih)?.toString() ?? null) : null,
    }
  })

  const hasil = await tambahItemMonitoring(sesiId, daftar, { sumberInput: 'CRAWLER' })

  await prisma.monitoringKandidat.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { status: 'diambil' },
  })

  return hasil
}

export async function tolakKandidat(daftarId) {
  await prisma.monitoringKandidat.updateMany({
    where: { id: { in: daftarId.map((x) => BigInt(x)) } },
    data: { status: 'ditolak' },
  })
}

// ---------------------------------------------------------------------
// Daftar item yang perlu direview (lintas sesi)
// ---------------------------------------------------------------------
export async function getItemPerluReview({ page = 1, limit = 30, bulan = null } = {}) {
  const skip = (Math.max(1, page) - 1) * limit

  let filterSesi = {}
  if (bulan && /^\d{4}-\d{2}$/.test(bulan)) {
    const [y, m] = bulan.split('-').map(Number)
    const hari = new Date(Date.UTC(y, m, 0)).getUTCDate()
    filterSesi = {
      sesi: {
        contentDate: {
          gte: new Date(`${bulan}-01T00:00:00.000+07:00`),
          lte: new Date(`${bulan}-${String(hari).padStart(2, '0')}T23:59:59.999+07:00`),
        },
      },
    }
  }

  const where = { isReviewed: false, ...filterSesi }

  const [rows, total, kategori] = await Promise.all([
    prisma.monitoringItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sesiId: 'asc' }, { urutan: 'asc' }],
      select: {
        id: true, judul: true, url: true, kanal: true, sumber: true,
        kategoriId: true, confidence: true, sumberInput: true,
        sesi: { select: { id: true, contentDate: true, state: true } },
      },
    }),
    prisma.monitoringItem.count({ where }),
    prisma.monitoringKategori.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, kode: true, nama: true, sortOrder: true },
    }),
  ])

  return {
    data: rows.map((r) => ({
      id: r.id.toString(),
      judul: r.judul,
      url: r.url,
      kanal: r.kanal,
      sumber: r.sumber,
      kategoriId: r.kategoriId.toString(),
      confidence: r.confidence,
      sumberInput: r.sumberInput,
      sesiId: r.sesi.id,
      tanggal: tanggalWib(r.sesi.contentDate),
      sesiFinal: r.sesi.state === 'final',
    })),
    kategori: kategori.map((k) => ({
      id: k.id.toString(), kode: k.kode, nama: k.nama, sortOrder: k.sortOrder,
    })),
    pagination: { page, limit, total, totalPage: Math.ceil(total / limit) },
  }
}

// Tandai benar tanpa mengubah kategorinya — untuk item yang saran sistemnya
// ternyata sudah tepat.
export async function tandaiSudahReview(daftarId) {
  const ids = daftarId.map((x) => BigInt(x))
  for (let i = 0; i < ids.length; i += 400) {
    await prisma.monitoringItem.updateMany({
      where: { id: { in: ids.slice(i, i + 400) } },
      data: { isReviewed: true },
    })
  }
}