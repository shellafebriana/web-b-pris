import prisma from '@/lib/prisma'

// Normalisasi nama platform dari DB -> key pencocokan (lowercase, tanpa spasi)
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '')
}

// Mapping nama Platform (DB) -> singkatan yang dipakai di laporan
// SESUAIKAN kalau nama di DB kamu beda dari ini
const PLATFORM_ABBR = {
  instagram: 'IG',
  facebook: 'FB',
  twitter: 'X',
  x: 'X',
  tiktok: 'TT',
  snackvideo: 'SV',
  youtube: 'YT',
}

const ABBR_LABEL = {
  IG: 'INSTAGRAM',
  FB: 'FACEBOOK',
  X: 'TWITTER',
  TT: 'TIKTOK',
  SV: 'SNACK VIDEO',
  YT: 'YOUTUBE',
}

// Urutan tetap tabel statistik slide 2 (IG, X, FB, TT, SV, YT)
const STATS_ORDER = ['IG', 'X', 'FB', 'TT', 'SV', 'YT']

// Pasangan slide link-dump (slide 4, 5, 6) - urutan & pasangan FIX sesuai contoh PPT
const LINK_SLIDE_GROUPS = [
  { platforms: ['IG', 'FB'] },
  { platforms: ['X', 'TT'] },
  { platforms: ['SV', 'YT'] },
]

export async function getViralisasiSpripimData(sessionId) {
  const session = await prisma.rekapSession.findUnique({
    where: { id: sessionId },
    include: {
      links: { include: { platform: true } },
    },
  })

  if (!session) throw new Error('Sesi tidak ditemukan')
  if (session.links.length === 0) throw new Error('Sesi ini belum ada link, gak bisa di-generate')

  const byAbbr = {}
  const unmappedPlatforms = new Set()

  for (const link of session.links) {
    const abbr = PLATFORM_ABBR[normalizeName(link.platform.name)]
    if (!abbr) {
      unmappedPlatforms.add(link.platform.name)
      continue
    }
    if (!byAbbr[abbr]) byAbbr[abbr] = []
    byAbbr[abbr].push(link.url)
  }

  const stats = STATS_ORDER.map((abbr) => ({ abbr, count: byAbbr[abbr]?.length || 0 }))
  const total = stats.reduce((sum, s) => sum + s.count, 0)

  const linkGroups = LINK_SLIDE_GROUPS.map((group) => ({
    columns: group.platforms.map((abbr) => ({
      abbr,
      label: ABBR_LABEL[abbr],
      links: byAbbr[abbr] || [],
    })),
  }))

  return {
    sessionId: session.id,
    sessionTitle: session.title || '-',
    dateRange: session.dateRange || '',
    stats,
    total,
    linkGroups,
    // kalau ada link dari platform di luar 6 ini, gak ikut hitung -> perlu tau biar gak ilang diam-diam
    unmappedPlatforms: [...unmappedPlatforms],
  }
}