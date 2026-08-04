import prisma from '@/lib/prisma'

/** Format default kalau user belum milih apa-apa di filter. */
export const FORMAT_MEDSOS = 'format1'


/** Isi dropdown filter. ReportFormat.id String, jadi gak ada urusan BigInt. */
export async function getFormatMedsos() {
  return prisma.reportFormat.findUnique({
    where: { id: FORMAT_MEDSOS },
    select: { id: true, name: true, isActive: true },
  })
}

/** Kolom tabel = platform sosmed, urut sortOrder. BigInt -> string di layer ini. */
export async function getPlatformSosmed() {
  const rows = await prisma.platform.findMany({
    where: { category: 'sosmed' },
    select: { id: true, name: true, shortName: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return rows.map((p) => ({
    id: p.id.toString(),
    name: p.name,
    shortName: p.shortName || p.name.slice(0, 2).toUpperCase(),
  }))
}

/**
 * Filter periode di level SESI: COALESCE(contentDate, createdAt).
 * contentDate NULL = ikut createdAt, jadi data lama gak berubah perilakunya.
 */
function filterPeriodeSesi({ formatIds, start, end }) {
  return {
    formatId: { in: formatIds },
    OR: [
      { contentDate: { gte: start, lt: end } },
      { contentDate: null, createdAt: { gte: start, lt: end } },
    ],
  }
}

/**
 * Rekap Media Sosial: matriks unit x platform.
 * Hitungan dikerjain DB lewat groupBy — bukan tarik semua Link lalu hitung di JS.
 * Hasil groupBy paling banyak 26 unit x 7 platform = 182 baris, murah dirakit.
 */
export async function getRekapMediaSosial({ formatIds, start, end, unitType = 'POLSEK' }) {
  const platforms = await getPlatformSosmed()

  if (!Array.isArray(formatIds) || formatIds.length === 0 || platforms.length === 0) {
    return { platforms, rows: [], totalPerPlatform: {}, totalSemua: 0, adaData: false }
  }

  const [units, grouped] = await Promise.all([
    prisma.unit.findMany({
      where: { type: unitType },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.link.groupBy({
      by: ['unitId', 'platformId'],
      where: {
        unitId: { not: null },
        platform: { category: 'sosmed' },
        session: filterPeriodeSesi({ formatIds, start, end }),
      },
      _count: { _all: true },
    }),
  ])

  // unitId -> { platformId -> jumlah }
  const peta = new Map()
  for (const g of grouped) {
    const uid = g.unitId.toString()
    if (!peta.has(uid)) peta.set(uid, {})
    peta.get(uid)[g.platformId.toString()] = g._count._all
  }

  const totalPerPlatform = {}
  for (const p of platforms) totalPerPlatform[p.id] = 0
  let totalSemua = 0

  // Iterasi dari daftar unit (bukan dari hasil groupBy) supaya polsek tanpa data
  // tetap muncul dengan nilai 0 — biar rankingnya jujur.
  let rows = units.map((u) => {
    const raw = peta.get(u.id.toString()) || {}
    const counts = {}
    let total = 0
    for (const p of platforms) {
      const n = raw[p.id] || 0
      counts[p.id] = n
      total += n
      totalPerPlatform[p.id] += n
    }
    totalSemua += total
    return { unitId: u.id.toString(), unitName: u.name, counts, total }
  })

  rows.sort((a, b) => b.total - a.total || a.unitName.localeCompare(b.unitName, 'id'))
  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }))

  return { platforms, rows, totalPerPlatform, totalSemua, adaData: totalSemua > 0 }
}