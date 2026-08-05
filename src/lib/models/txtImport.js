import prisma from '@/lib/prisma'
import { normalizeUrl } from '@/lib/url-utils'

const CHUNK_CEK = 400

/** Kamus deteksi unit & platform. Master data, kecil, aman di-load sekali. */
export async function getKamusImport() {
  const [units, platforms] = await Promise.all([
    prisma.unit.findMany({
      where: { type: 'POLSEK' },
      select: { id: true, name: true, domains: true },
      orderBy: { name: 'asc' },
    }),
    prisma.platform.findMany({ select: { id: true, name: true, domain: true } }),
  ])
  return {
    units: units.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      domains: Array.isArray(u.domains) ? u.domains : [],
    })),
    platforms: platforms.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      domain: Array.isArray(p.domain) ? p.domain : [],
    })),
  }
}

/**
 * URL yang SUDAH ada di format ini — LINTAS SESI.
 * Judul sesi bikinan bot beda dari judul turunan slug, jadi pencocokan judul
 * gak bisa diandelin. URL itu identitas yang pasti.
 * Di-scope ke kandidat (`url IN (...)`), bukan narik semua link format ini.
 */
export async function cariUrlSudahAda(formatId, urls) {
  const ada = new Set()
  for (let i = 0; i < urls.length; i += CHUNK_CEK) {
    const bagian = urls.slice(i, i + CHUNK_CEK)
    const varian = bagian.flatMap((u) => [u, `${u}/`]) // toleransi trailing slash
    const rows = await prisma.link.findMany({
      where: { session: { formatId }, url: { in: varian } },
      select: { url: true },
    })
    for (const r of rows) ada.add(normalizeUrl(r.url))
  }
  return ada
}