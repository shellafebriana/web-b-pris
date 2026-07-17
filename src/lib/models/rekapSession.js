import prisma from '@/lib/prisma'
import Mustache from 'mustache'
import { getAppConfigValue } from './appConfig'
import { detectPlatformId } from '@/lib/platform-detect'

Mustache.escape = (text) => text

const VALID_STATES = ['draft', 'active', 'finished']

export async function getAllRekapSessions({ search = '', state = '', formatId = '', page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit

  const where = {
    ...(search ? { title: { contains: search } } : {}),
    ...(VALID_STATES.includes(state) ? { state } : {}),
    ...(formatId ? { formatId } : {}),
  }

  const [total, sessions] = await Promise.all([
    prisma.rekapSession.count({ where }),
    prisma.rekapSession.findMany({
      where,
      include: { format: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    data: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      state: s.state,
      totalLinks: s.totalLinks,
      formatName: s.format?.name ?? '-',
    })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  }
}

export async function deleteRekapSession(id) {
  await prisma.rekapSession.delete({ where: { id } })
}

export async function getRekapSessionById(id) {
  const session = await prisma.rekapSession.findUnique({
    where: { id },
    include: {
      format: true,
      operator: { select: { waId: true } },
      links: {
        include: { platform: true, unit: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!session) return null

  return {
    id: session.id,
    title: session.title,
    dateRange: session.dateRange,
    state: session.state,
    totalLinks: session.totalLinks,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    summaryJson: session.summaryJson,
    format: {
      id: session.format.id,
      name: session.format.name,
      config: session.format.config,
    },
    operatorWaId: session.operator?.waId ?? '-',
    links: session.links.map((l) => ({
      id: l.id.toString(),
      url: l.url,
      isPriority: l.isPriority,
      createdAt: l.createdAt,
      platform: { id: l.platform.id.toString(), name: l.platform.name },
      unit: l.unit ? { id: l.unit.id.toString(), name: l.unit.name } : null,
    })),
  }
}

export async function updateRekapSessionInfo(id, { title, dateRange }) {
  const session = await prisma.rekapSession.update({
    where: { id },
    data: {
      title: title?.trim() || null,
      dateRange: dateRange?.trim() || null,
    },
  })
  return { id: session.id }
}

// URL "kedeteksi" platform lain (BEDA dari yang dipilih) -> kemungkinan besar salah pilih
function findConflictingPlatform(url, selectedPlatformId, allPlatforms) {
  const detectedId = detectPlatformId(url, allPlatforms)
  if (!detectedId || detectedId === String(selectedPlatformId)) return null
  return allPlatforms.find((p) => p.id === detectedId) || null
}

export async function addLinksToSession(sessionId, items) {
  if (!items || items.length === 0) {
    throw new Error('Minimal 1 link harus diisi')
  }
  for (const item of items) {
    if (!item.url?.trim()) throw new Error('URL tidak boleh kosong')
    if (!item.platformId) throw new Error(`Platform wajib dipilih untuk link: ${item.url}`)
  }

  const session = await prisma.rekapSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Sesi tidak ditemukan')

  const allPlatforms = (await prisma.platform.findMany()).map((p) => ({
    id: p.id.toString(),
    name: p.name,
    domain: p.domain,
  }))

  const normalize = (url) => url.trim().replace(/\/+$/, '')
  const existing = await prisma.link.findMany({ where: { sessionId }, select: { url: true } })
  const existingUrls = new Set(existing.map((l) => normalize(l.url)))

  const seenInBatch = new Set()
  const toInsert = []
  const duplicates = []
  const conflicts = []

  for (const item of items) {
    const normalized = normalize(item.url)
    if (existingUrls.has(normalized) || seenInBatch.has(normalized)) {
      duplicates.push(item.url)
      continue
    }

    const conflict = findConflictingPlatform(item.url, item.platformId, allPlatforms)
    if (conflict) {
      conflicts.push({ url: item.url, detected: conflict.name })
      continue
    }

    seenInBatch.add(normalized)
    toInsert.push(item)
  }

  if (toInsert.length === 0) {
    if (conflicts.length === 1 && duplicates.length === 0) {
      throw new Error(`URL ini kedeteksi dari ${conflicts[0].detected}, bukan platform yang dipilih. Cek lagi ya.`)
    }
    if (conflicts.length > 0) {
      throw new Error(`${conflicts.length} link platform-nya gak cocok sama domain URL-nya.`)
    }
    throw new Error(
      items.length === 1 ? 'Link ini udah ada di sesi ini' : `Semua ${items.length} link yang di-paste udah ada di sesi ini`
    )
  }

  await prisma.$transaction([
    prisma.link.createMany({
      data: toInsert.map((item) => ({
        url: item.url.trim(),
        sessionId,
        platformId: BigInt(item.platformId),
        unitId: item.unitId ? BigInt(item.unitId) : null,
      })),
    }),
    prisma.rekapSession.update({
      where: { id: sessionId },
      data: { totalLinks: { increment: toInsert.length } },
    }),
  ])

  return { added: toInsert.length, duplicates, conflicts }
}

export async function updateLink(linkId, { url, unitId }) {
  if (!url?.trim()) throw new Error('URL tidak boleh kosong')

  const link = await prisma.link.update({
    where: { id: BigInt(linkId) },
    data: {
      url: url.trim(),
      unitId: unitId ? BigInt(unitId) : null,
    },
  })
  return { id: link.id.toString() }
}

export async function deleteLink(linkId, sessionId) {
  await prisma.$transaction([
    prisma.link.delete({ where: { id: BigInt(linkId) } }),
    prisma.rekapSession.update({
      where: { id: sessionId },
      data: { totalLinks: { decrement: 1 } },
    }),
  ])
}

const WEB_DEFAULT_OPERATOR_WA_ID = process.env.WEB_DEFAULT_OPERATOR_WA_ID

export async function createRekapSession({ formatId, title, dateRange }) {
  if (!formatId) throw new Error('Format wajib dipilih')
  if (!WEB_DEFAULT_OPERATOR_WA_ID) {
    throw new Error('WEB_DEFAULT_OPERATOR_WA_ID belum di-set di .env')
  }

  const format = await prisma.reportFormat.findUnique({ where: { id: formatId } })
  if (!format) throw new Error('Format tidak ditemukan')

  const config = format.config || {}
  if (config.requiredFields?.includes('title') && !title?.trim()) {
    throw new Error('Judul wajib diisi untuk format ini')
  }
  if (config.requiredFields?.includes('dateRange') && !dateRange?.trim()) {
    throw new Error('Periode tanggal wajib diisi untuk format ini')
  }

  const operator = await prisma.operator.upsert({
    where: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
    update: {},
    create: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
  })

  const session = await prisma.rekapSession.create({
    data: {
      formatId,
      operatorId: operator.id,
      title: title?.trim() || null,
      dateRange: dateRange?.trim() || null,
    },
  })

  return { id: session.id }
}

function isPlatformAllowed(platformName, config) {
  if (!Array.isArray(config?.requiredPlatform) || config.requiredPlatform.length === 0) return true
  return config.requiredPlatform.some((p) => p.toLowerCase() === platformName.toLowerCase())
}

export function filterPlatformsByFormat(platforms, config) {
  return platforms.filter((p) => isPlatformAllowed(p.name, config))
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function orderLinks(links, config) {
  if (config.sortByPriority) {
    const priority = links.filter((l) => l.isPriority)
    const normal = links.filter((l) => !l.isPriority)
    return config.shuffle ? [...shuffleArray(priority), ...shuffleArray(normal)] : [...priority, ...normal]
  }
  return config.shuffle ? shuffleArray(links) : links
}

function buildMustacheContext({ session, stableLinks, displayLinks, pejabat }) {
  const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const platformOrder = []
  const unitOrder = []
  for (const l of stableLinks) {
    if (!platformOrder.includes(l.platform.name)) platformOrder.push(l.platform.name)
    if (l.unit && !unitOrder.includes(l.unit.name)) unitOrder.push(l.unit.name)
  }

  const units = unitOrder.map((unitName) => {
    const unitLinks = displayLinks.filter((l) => l.unit?.name === unitName)
    const platMap = new Map()
    for (const l of unitLinks) {
      if (!platMap.has(l.platform.name)) platMap.set(l.platform.name, [])
      platMap.get(l.platform.name).push(l.url)
    }
    return {
      name: unitName,
      links: unitLinks.map((l) => l.url),
      platformsInUnit: [...platMap.entries()].map(([platformName, plinks]) => ({
        platformName,
        platformCount: plinks.length,
        links: plinks,
      })),
    }
  })

  const platforms = platformOrder.map((platformName, idx) => {
    const plinks = displayLinks.filter((l) => l.platform.name === platformName)
    const unitMap2 = new Map()
    for (const l of plinks) {
      if (!l.unit) continue
      if (!unitMap2.has(l.unit.name)) unitMap2.set(l.unit.name, [])
      unitMap2.get(l.unit.name).push(l.url)
    }
    return {
      name: platformName,
      count: plinks.length,
      number: idx + 1,
      letter: String.fromCharCode(65 + idx),
      links: plinks.map((l) => l.url),
      unitsInPlatform: [...unitMap2.entries()].map(([unitName, ulinks]) => ({ unitName, links: ulinks })),
    }
  })

  return {
    date: dateFmt.format(new Date()),
    dateRange: session.dateRange || '',
    title: session.title || '',
    pejabat: pejabat || '',
    count: displayLinks.length,
    urls: displayLinks.map((l, i) => `${i + 1}. ${l.url}`),
    units,
    platforms,
    platformsSummary: platforms.map((p) => ({ name: p.name, count: p.count, letter: p.letter })),
    platformsDetailed: platforms.map((p) => ({ name: p.name, number: p.number, links: p.links })),
  }
}

export async function generateReport(sessionId) {
  const session = await prisma.rekapSession.findUnique({
    where: { id: sessionId },
    include: {
      format: true,
      links: {
        include: { platform: true, unit: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!session) throw new Error('Sesi tidak ditemukan')
  if (session.links.length === 0) throw new Error('Belum ada link buat di-generate')

  const config = session.format.config || {}

  const links = session.links.filter((l) => isPlatformAllowed(l.platform.name, config))
  if (links.length === 0) {
    throw new Error('Gak ada link yang platform-nya cocok sama daftar platform format ini')
  }

  const displayLinks = orderLinks(links, config)

  const pejabat = await getAppConfigValue('nama_kapolresta')
  const context = buildMustacheContext({ session, stableLinks: links, displayLinks, pejabat })

  let text
  try {
    text = Mustache.render(session.format.template, context)
  } catch (error) {
    throw new Error(`Template error: ${error.message}`)
  }

  await prisma.rekapSession.update({
    where: { id: sessionId },
    data: {
      state: 'finished',
      completedAt: new Date(),
      summaryJson: { text },
    },
  })

  return { text }
}