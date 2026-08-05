import prisma from '@/lib/prisma'
import { buildBuckets, bucketKey } from '@/lib/laporan/periode'

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
function rakitMatriks({ units, columns, counts }) {
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

function ambilUnits(unitType) {
  return prisma.unit.findMany({
    where: { type: unitType },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
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
export async function getRekapMediaOnline({ formatIds, periode, unitType = 'POLSEK' }) {
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
    ambilUnits(unitType),
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