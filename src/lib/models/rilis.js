import prisma from '@/lib/prisma'
import { buildBuckets, bucketKey } from '@/lib/laporan/periode'
import { rakitMatriks } from '@/lib/models/laporan'

/**
 * KONTEN RAYON — kolom = bucket periode.
 * Beda dari Media Online: tanggal nempel langsung di baris (contentDate),
 * jadi tidak perlu lewat sesi. groupBy paling banyak 26 unit x 31 hari.
 */
export async function getRekapKontenRayon({
  periode,
  unitType = 'POLSEK',
  hanyaIkutRayon = true,
}) {
  const columns = buildBuckets(periode)

  const [units, grouped] = await Promise.all([
    prisma.unit.findMany({
      // Polsek tanpa rayon (mis. Satpolairud) tidak punya grup untuk mengirim,
      // jadi barisnya nol terus dan cuma bikin salah baca.
      where: {
        type: unitType,
        ...(hanyaIkutRayon ? { rayon: { not: null } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.rilisSubmission.groupBy({
      by: ['unitId', 'contentDate'],
      where: { contentDate: { gte: periode.start, lt: periode.end } },
      _count: { _all: true },
    }),
  ])

  const counts = new Map()
  for (const g of grouped) {
    const uid = g.unitId.toString()
    const key = bucketKey(g.contentDate, periode)
    if (!counts.has(uid)) counts.set(uid, {})
    const isi = counts.get(uid)
    isi[key] = (isi[key] || 0) + g._count._all
  }

  return rakitMatriks({ units, columns, counts })
}

export async function getUnitsUntukRilis() {
  const rows = await prisma.unit.findMany({
    where: { type: 'POLSEK' },
    select: { id: true, name: true, aliases: true },
    orderBy: { name: 'asc' },
  })
  return rows.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    aliases: Array.isArray(u.aliases) ? u.aliases : [],
  }))
}

/** Fingerprint yang sudah ada — scoped ke kandidat, bukan tarik semua baris. */
export async function cariFingerprintAda(fingerprints) {
  const ada = new Set()
  for (let i = 0; i < fingerprints.length; i += 400) {
    const rows = await prisma.rilisSubmission.findMany({
      where: { fingerprint: { in: fingerprints.slice(i, i + 400) } },
      select: { fingerprint: true },
    })
    for (const r of rows) ada.add(r.fingerprint)
  }
  return ada
}

export async function simpanRilis(items) {
  if (!items.length) return { dibuat: 0 }
  let dibuat = 0
  for (let i = 0; i < items.length; i += 200) {
    const res = await prisma.rilisSubmission.createMany({
      data: items.slice(i, i + 200),
      skipDuplicates: true, // jaring pengaman kalau ada request paralel
    })
    dibuat += res.count
  }
  return { dibuat }
}