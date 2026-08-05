import { ekstrakUrl } from '@/lib/wa-txt-parser'
import { detectUnitIdByUrl } from '@/lib/unit-detect'
import { detectPlatformIdWithFallback } from '@/lib/platform-detect'
import { getArticleSlug, slugToTitle } from '@/lib/wa-paste-parser'
import { normalizeUrl, isValidUrl } from '@/lib/url-utils'

const pad = (n) => String(n).padStart(2, '0')

/** {y,m,d} -> ISO instant tengah malam WIB. Offset ditulis eksplisit. */
export function tanggalKeIso({ y, m, d }) {
  return `${y}-${pad(m)}-${pad(d)}T00:00:00.000+07:00`
}

/**
 * Analisis MURNI — tanpa DB. Dipakai bareng route analisis & commit,
 * supaya yang di-preview persis sama dengan yang disimpan.
 */
export function analisisTxt(raw, { units, platforms }) {
  const { hasil, statistik } = ekstrakUrl(raw)

  const artikel = new Map()
  const ditolak = []
  const perUnitTanggal = new Map()
  const seen = new Set()
  let duplikatInternal = 0

  for (const h of hasil) {
    const norm = normalizeUrl(h.url)
    if (seen.has(norm)) { duplikatInternal++; continue }
    seen.add(norm)

    if (!isValidUrl(h.url)) {
      ditolak.push({ url: h.url, alasan: 'URL tidak valid' }); continue
    }
    const unitId = detectUnitIdByUrl(h.url, units)
    if (!unitId) {
      ditolak.push({ url: h.url, alasan: 'Domain tidak terdaftar di unit mana pun' }); continue
    }
    const platformId = detectPlatformIdWithFallback(h.url, platforms)
    if (!platformId) {
      ditolak.push({ url: h.url, alasan: 'Platform tidak terdeteksi' }); continue
    }
    const slug = getArticleSlug(h.url)
    if (!slug) {
      ditolak.push({ url: h.url, alasan: 'Slug artikel tidak terbaca' }); continue
    }

    const iso = tanggalKeIso(h.tanggal)
    if (!artikel.has(slug)) {
      artikel.set(slug, { slug, title: slugToTitle(slug), contentDate: iso, links: [] })
    }
    const a = artikel.get(slug)
    if (iso < a.contentDate) a.contentDate = iso // artikel lintas hari: ambil paling awal
    a.links.push({ url: h.url, unitId, platformId })

    const kunci = `${h.tanggal.y}-${pad(h.tanggal.m)}-${pad(h.tanggal.d)}`
    if (!perUnitTanggal.has(unitId)) perUnitTanggal.set(unitId, {})
    const peta = perUnitTanggal.get(unitId)
    peta[kunci] = (peta[kunci] || 0) + 1
  }

  return {
    groups: [...artikel.values()],
    ditolak,
    perUnitTanggal: Object.fromEntries(perUnitTanggal),
    statistik: {
      ...statistik,
      urlDitemukan: hasil.length,
      urlUnik: seen.size,
      duplikatInternal,
      artikel: artikel.size,
      ditolak: ditolak.length,
    },
  }
}

/** Buang link yang URL-nya udah ada di DB. Grup yang jadi kosong ikut dibuang. */
export function saringYangSudahAda(groups, setSudahAda) {
  const sisa = []
  let dilewati = 0
  for (const g of groups) {
    const links = g.links.filter((l) => {
      if (setSudahAda.has(normalizeUrl(l.url))) { dilewati++; return false }
      return true
    })
    if (links.length > 0) sisa.push({ ...g, links })
  }
  return { groups: sisa, dilewati }
}