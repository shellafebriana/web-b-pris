import prisma from '@/lib/prisma'
import { buildBuckets, bucketKey, komponenWib, parsePeriode } from '@/lib/laporan/periode'

export const FORMAT_MEDIA_SOSIAL = 'format1'
export const FORMAT_MEDIA_ONLINE = 'format16'

/** Cek format sumber masih ada & aktif — biar format non-aktif gak jadi tabel kosong misterius. */
export async function getFormatLaporan(id) {
  return prisma.reportFormat.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  })
}

export async function getPlatformSosmed() {
  const rows = await prisma.platform.findMany({
    where: { category: 'sosmed' },
    select: { id: true, name: true, shortName: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return rows.map((p) => ({
    id: p.id.toString(),
    key: p.id.toString(),
    label: p.shortName || p.name.slice(0, 2).toUpperCase(),
    subLabel: p.name,
  }))
}

/** Periode di level SESI: COALESCE(contentDate, createdAt). */
function filterPeriodeSesi({ formatIds, start, end }) {
  return {
    formatId: { in: formatIds },
    OR: [
      { contentDate: { gte: start, lt: end } },
      { contentDate: null, createdAt: { gte: start, lt: end } },
    ],
  }
}

const HASIL_KOSONG = (columns) => ({
  columns, rows: [], totalPerColumn: {}, totalSemua: 0, adaData: false,
})

/** Rakit matriks unit x kolom. `counts` = Map(unitId -> { colKey: jumlah }) */
export function rakitMatriks({ units, columns, counts }) {
  const totalPerColumn = {}
  for (const c of columns) totalPerColumn[c.key] = 0
  let totalSemua = 0

  // Iterasi dari daftar unit (bukan hasil query) supaya unit tanpa data tetap
  // muncul dengan nilai 0 — biar rankingnya jujur.
  let rows = units.map((u) => {
    const id = u.id.toString()
    const raw = counts.get(id) || {}
    const isi = {}
    let total = 0
    for (const c of columns) {
      const n = raw[c.key] || 0
      isi[c.key] = n
      total += n
      totalPerColumn[c.key] += n
    }
    totalSemua += total
    return { id, name: u.name, counts: isi, total }
  })

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'id'))
  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }))

  return { columns, rows, totalPerColumn, totalSemua, adaData: totalSemua > 0 }
}

async function ambilUnits(unitType, { hanyaPunyaDomain = false } = {}) {
  const rows = await prisma.unit.findMany({
    where: { type: unitType },
    select: { id: true, name: true, ...(hanyaPunyaDomain ? { domains: true } : {}) },
    orderBy: { name: 'asc' },
  })
  if (!hanyaPunyaDomain) return rows
  // Disaring di JS, bukan di query: `domains` itu kolom Json, dan filter
  // `not: DbNull` di Prisma gak nangkep kasus array kosong `[]` yang secara
  // teknis bukan NULL tapi sama aja gak punya domain. Unit itu master data
  // (26 baris), jadi biayanya nol.
  return rows.filter((u) => Array.isArray(u.domains) && u.domains.length > 0)
}

/** MEDIA SOSIAL — kolom = platform sosmed. */
export async function getRekapMediaSosial({ formatIds, periode, unitType = 'POLSEK' }) {
  const columns = await getPlatformSosmed()
  if (!formatIds?.length || columns.length === 0) return HASIL_KOSONG(columns)

  const [units, grouped] = await Promise.all([
    ambilUnits(unitType),
    prisma.link.groupBy({
      by: ['unitId', 'platformId'],
      where: {
        unitId: { not: null },
        platform: { category: 'sosmed' },
        session: filterPeriodeSesi({ formatIds, start: periode.start, end: periode.end }),
      },
      _count: { _all: true },
    }),
  ])

  const counts = new Map()
  for (const g of grouped) {
    const uid = g.unitId.toString()
    if (!counts.has(uid)) counts.set(uid, {})
    counts.get(uid)[g.platformId.toString()] = g._count._all
  }

  return rakitMatriks({ units, columns, counts })
}

/**
 * MEDIA ONLINE — kolom = bucket periode (minggu/bulan).
 * Link gak punya tanggal sendiri, jadi bucket diturunkan dari tanggal efektif SESI.
 * Dua query: ambil sesi dulu (maping sesi->bucket), baru groupBy link.
 */
export async function getRekapMediaOnline({ formatIds, periode, unitType = 'POLSEK', hanyaPunyaDomain = true }) {
  const columns = buildBuckets(periode)
  if (!formatIds?.length) return HASIL_KOSONG(columns)

  const sesi = await prisma.rekapSession.findMany({
    where: filterPeriodeSesi({ formatIds, start: periode.start, end: periode.end }),
    select: { id: true, contentDate: true, createdAt: true },
  })
  if (sesi.length === 0) return HASIL_KOSONG(columns)

  const bucketSesi = new Map(
    sesi.map((s) => [s.id, bucketKey(s.contentDate ?? s.createdAt, periode)])
  )

  const [units, grouped] = await Promise.all([
    ambilUnits(unitType, { hanyaPunyaDomain }),
    prisma.link.groupBy({
      by: ['unitId', 'sessionId'],
      where: { unitId: { not: null }, sessionId: { in: [...bucketSesi.keys()] } },
      _count: { _all: true },
    }),
  ])

  const counts = new Map()
  for (const g of grouped) {
    const uid = g.unitId.toString()
    const key = bucketSesi.get(g.sessionId)
    if (!key) continue
    if (!counts.has(uid)) counts.set(uid, {})
    const isi = counts.get(uid)
    isi[key] = (isi[key] || 0) + g._count._all
  }

  return rakitMatriks({ units, columns, counts })
}

/**
 * Kelengkapan data per tanggal — cuma relevan di mode bulanan.
 * Tanpa ini, hari yang gak pernah diinput kebaca sama persis dengan hari yang
 * beneran nihil kiriman, dan laporannya jadi menuduh polsek yang salah.
 */
export async function getKelengkapanHarian({ formatIds, periode }) {
  if (periode.mode !== 'bulanan' || !formatIds?.length) return null

  const sesi = await prisma.rekapSession.findMany({
    where: filterPeriodeSesi({ formatIds, start: periode.start, end: periode.end }),
    select: { contentDate: true, createdAt: true, totalLinks: true },
  })

  const perTanggal = {}
  for (const s of sesi) {
    const { d } = komponenWib(s.contentDate ?? s.createdAt)
    if (!perTanggal[d]) perTanggal[d] = { sesi: 0, link: 0 }
    perTanggal[d].sesi++
    perTanggal[d].link += s.totalLinks || 0
  }

  const [y, m] = periode.periode.split('-').map(Number)
  const hariAkhir = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7 // 0 = Senin

  // Bulan berjalan: hari yang belum tiba jangan dihitung sebagai bolong.
  const now = komponenWib(new Date())
  const hariEfektif = y === now.y && m === now.m ? Math.min(now.d, hariAkhir) : hariAkhir

  let hariAda = 0
  for (let d = 1; d <= hariEfektif; d++) if (perTanggal[d]) hariAda++

  return {
    y, m, hariAkhir, offset, hariEfektif, perTanggal,
    hariAda,
    hariKosong: hariEfektif - hariAda,
  }
}

// ============================================================
// VIRALISASI SPRIPIM — pembaca sesi format5 (Manajemen Media Sosial Kapolda).
// Menu ini TIDAK bikin/ubah data. Cuma mecah link sesi per platform biar bisa
// disalin ke PowerPoint — gantiin langkah spreadsheet manual.
// ============================================================

export const FORMAT_VIRALISASI = 'format5'

// sessionId dateng dari URL. Prisma udah parameterized, tapi disaring dulu biar
// query sampah gak pernah nyentuh DB (dan biar 404-nya cepet).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/

export async function getSesiViralisasi({ tanggal = '', page = 1, limit = 10 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 10, 1), 50)
  const halaman = Math.max(Number(page) || 1, 1)

  // Kosong / format ngaco -> tampilkan SEMUA tanggal.
  // parsePeriode sengaja cuma dipanggil kalau polanya udah cocok, soalnya dia
  // fallback ke HARI INI kalau input gak valid — bukan yang kita mau di sini.
  const periode = TANGGAL_RE.test(tanggal)
    ? parsePeriode({ mode: 'harian', periode: tanggal })
    : null

  // filterPeriodeSesi = COALESCE(contentDate, createdAt), batas harinya WIB
  const where = periode
    ? filterPeriodeSesi({ formatIds: [FORMAT_VIRALISASI], start: periode.start, end: periode.end })
    : { formatId: FORMAT_VIRALISASI }

  const [total, rows] = await Promise.all([
    prisma.rekapSession.count({ where }),
    prisma.rekapSession.findMany({
      where,
      select: { id: true, title: true, contentDate: true, createdAt: true, totalLinks: true },
      orderBy: [{ contentDate: 'desc' }, { createdAt: 'desc' }],
      skip: (halaman - 1) * take,
      take,
    }),
  ])

  return {
    data: rows.map((s) => ({
      id: s.id,
      judul: s.title || '(tanpa judul)',
      tanggal: (s.contentDate ?? s.createdAt).toISOString(),
      pakaiContentDate: Boolean(s.contentDate),
      totalLinks: s.totalLinks,
    })),
    pagination: { total, page: halaman, limit: take, pages: Math.ceil(total / take) || 1 },
    periode: periode ? { nilai: periode.periode, label: periode.label } : null,
  }
}

/** Ringkasan sesi + jumlah link per platform. Dihitung di DB, bukan tarik semua link. */
export async function getRingkasanViralisasi(sessionId) {
  if (!UUID_RE.test(sessionId || '')) return null

  const sesi = await prisma.rekapSession.findUnique({
    where: { id: sessionId },
    select: { id: true, title: true, formatId: true, contentDate: true, createdAt: true },
  })
  // Sesi format lain jangan bisa dibuka lewat menu ini walau ID-nya ditebak
  if (!sesi || sesi.formatId !== FORMAT_VIRALISASI) return null

  const grouped = await prisma.link.groupBy({
    by: ['platformId'],
    where: { sessionId },
    _count: { _all: true },
  })

  const dasar = {
    id: sesi.id,
    judul: sesi.title || '(tanpa judul)',
    tanggal: (sesi.contentDate ?? sesi.createdAt).toISOString(),
    pakaiContentDate: Boolean(sesi.contentDate),
  }

  if (grouped.length === 0) return { ...dasar, platforms: [], totalLink: 0 }

  // Lookup di-SCOPE ke platform yang beneran muncul di sesi ini
  const platforms = await prisma.platform.findMany({
    where: { id: { in: grouped.map((g) => g.platformId) } },
    select: { id: true, name: true, shortName: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  const jumlah = new Map(grouped.map((g) => [g.platformId.toString(), g._count._all]))

  const daftar = platforms.map((p) => ({
    id: p.id.toString(),
    label: p.shortName || p.name,
    nama: p.name,
    jumlah: jumlah.get(p.id.toString()) || 0,
  }))

  return {
    ...dasar,
    platforms: daftar,
    // Sengaja dari hasil groupBy, BUKAN session.totalLinks — kolom itu counter
    // increment yang bisa melenceng kalau ada link dihapus manual.
    totalLink: daftar.reduce((n, p) => n + p.jumlah, 0),
  }
}

/** Link satu platform, apa adanya — duplikat TIDAK dibuang, di-key pakai id. */
export async function getLinkViralisasi(sessionId, platformId) {
  if (!UUID_RE.test(sessionId || '')) return []

  const semua = !platformId || platformId === 'all'
  if (!semua && !/^\d+$/.test(String(platformId))) return []

  const rows = await prisma.link.findMany({
    where: { sessionId, ...(semua ? {} : { platformId: BigInt(platformId) }) },
    select: { id: true, url: true },
    // Mode "semua" diurut per platform dulu biar hasil salinannya tetap
    // berkelompok, gak nyampur acak
    orderBy: semua
      ? [{ platform: { sortOrder: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }]
      : [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  return rows.map((l) => ({ id: l.id.toString(), url: l.url }))
}