import prisma from '@/lib/prisma'
import Mustache from 'mustache'
import { getAppConfigValue } from './appConfig'
import { detectPlatformIdWithFallback, isPlatformAllowed, filterPlatformsByFormat } from '@/lib/platform-detect'
import { normalizeUrl, isValidUrl } from '@/lib/url-utils'

Mustache.escape = (text) => text

const VALID_STATES = ['draft', 'active', 'finished']

export { filterPlatformsByFormat }

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

// Sengaja GAK nyertain `links` — sesi bisa punya ribuan link, dan halaman detail
// sekarang narik link-nya lewat getSessionLinksPage (paginated) secara terpisah
export async function getRekapSessionById(id) {
  const session = await prisma.rekapSession.findUnique({
    where: { id },
    include: {
      format: true,
      operator: { select: { waId: true } },
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
  }
}

// Meta cards dihitung DI DATABASE (groupBy), bukan load semua link + hitung
// manual di JS — kerjanya sama walau sesi punya 10 link atau 10.000 link
export async function getSessionMetaCounts(sessionId, config, units, platforms) {
  const groupBy = config.groupBy

  if (groupBy === 'unit') {
    const grouped = await prisma.link.groupBy({
      by: ['unitId'],
      where: { sessionId, unitId: { not: null } },
      _count: true,
    })
    const unitById = new Map(units.map((u) => [u.id, u]))
    const collected = grouped
      .map((g) => {
        const u = unitById.get(g.unitId.toString())
        return u ? { name: u.name, count: g._count } : null
      })
      .filter(Boolean)
    const collectedNames = new Set(collected.map((c) => c.name))
    const unitScope = config.unitScope || 'POLSEK'
    const notCollected = units.filter((u) => u.type === unitScope && !collectedNames.has(u.name))
    return { type: 'unit', collected, notCollected }
  }

  if (groupBy === 'platform') {
    const grouped = await prisma.link.groupBy({
      by: ['platformId'],
      where: { sessionId },
      _count: true,
    })
    const platformById = new Map(platforms.map((p) => [p.id, p.name]))
    const byPlatform = grouped.map((g) => ({
      name: platformById.get(g.platformId.toString()) || 'Lainnya',
      count: g._count,
    }))
    return { type: 'platform', byPlatform }
  }

  const priorityCount = await prisma.link.count({ where: { sessionId, isPriority: true } })
  return { type: 'default', priorityCount }
}

// Daftar link paginated — dipake SessionLinksList. Ganti dari "fetch semua +
// filter di client" jadi "server yang query, browser cuma nerima 1 halaman"
export async function getSessionLinksPage(sessionId, { search = '', platform = '', page = 1, limit = 50, sortByUnit = false } = {}) {
  const skip = (page - 1) * limit
  const where = {
    sessionId,
    ...(search ? { url: { contains: search } } : {}),
    ...(platform ? { platform: { name: platform } } : {}),
  }

  const orderBy = sortByUnit
    ? [{ unit: { name: 'asc' } }, { createdAt: 'asc' }]
    : { createdAt: 'asc' }

  const [total, links] = await Promise.all([
    prisma.link.count({ where }),
    prisma.link.findMany({
      where,
      include: { platform: true, unit: true },
      orderBy,
      skip,
      take: limit,
    }),
  ])

  return {
    data: links.map((l) => ({
      id: l.id.toString(),
      url: l.url,
      isPriority: l.isPriority,
      createdAt: l.createdAt,
      platform: { id: l.platform.id.toString(), name: l.platform.name },
      unit: l.unit ? { id: l.unit.id.toString(), name: l.unit.name } : null,
    })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  }
}

export async function getSessionExistingUrls(sessionId) {
  const links = await prisma.link.findMany({ where: { sessionId }, select: { url: true } })
  return links.map((l) => normalizeUrl(l.url))
}

// Daftar platformId yang beneran dipake di sesi ini — buat filter pills
// (biar gak nampilin pilihan platform yang sesi ini emang gak punya link-nya)
export async function getSessionLinkPlatformIds(sessionId) {
  const grouped = await prisma.link.groupBy({ by: ['platformId'], where: { sessionId } })
  return grouped.map((g) => g.platformId.toString())
}

export async function updateRekapSessionInfo(id, { title, dateRange }) {
  const session = await prisma.rekapSession.update({
    where: { id },
    data: { title: title?.trim() || null, dateRange: dateRange?.trim() || null },
  })
  return { id: session.id }
}

function findConflictingPlatform(url, selectedPlatformId, allPlatforms) {
  const detectedId = detectPlatformIdWithFallback(url, allPlatforms)
  if (!detectedId || detectedId === String(selectedPlatformId)) return null
  return allPlatforms.find((p) => p.id === detectedId) || null
}

// Variasi normalize buat query dedup — biar bisa nge-query database "cari yang
// PERSIS salah satu dari bentuk-bentuk ini" tanpa perlu narik semua data dulu
function urlVariants(url) {
  const trimmed = url.trim()
  const stripped = trimmed.replace(/\/+$/, '')
  return [trimmed, stripped, `${stripped}/`]
}

export async function addLinksToSession(sessionId, items) {
  if (!items || items.length === 0) throw new Error('Minimal 1 link harus diisi')
  for (const item of items) {
    if (!item.url?.trim()) throw new Error('URL tidak boleh kosong')
    if (!isValidUrl(item.url)) throw new Error(`URL gak valid: ${item.url}`)
    if (!item.platformId) throw new Error(`Platform wajib dipilih untuk link: ${item.url}`)
  }

  const session = await prisma.rekapSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Sesi tidak ditemukan')

  const allPlatforms = (await prisma.platform.findMany()).map((p) => ({
    id: p.id.toString(),
    name: p.name,
    domain: p.domain,
  }))

  // Dedup: query dibatesin ke VARIAN kandidat yang mau ditambahin — jadi query-nya
  // seringan batch-nya (biasanya puluhan/ratusan), bukan seberat total link
  // sesi ini (yang bisa ribuan)
  const candidateVariants = items.flatMap((item) => urlVariants(item.url))
  const existing = await prisma.link.findMany({
    where: { sessionId, url: { in: candidateVariants } },
    select: { url: true },
  })
  const existingUrls = new Set(existing.map((l) => normalizeUrl(l.url)))

  const seenInBatch = new Set()
  const toInsert = []
  const duplicates = []
  const conflicts = []

  for (const item of items) {
    const normalized = normalizeUrl(item.url)
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
  ], { maxWait: 10000, timeout: 10000 })

  return { added: toInsert.length, duplicates, conflicts }
}

export async function updateLink(linkId, sessionId, { url, unitId }) {
  if (!url?.trim()) throw new Error('URL tidak boleh kosong')
  if (!isValidUrl(url)) throw new Error('URL gak valid')

  const currentLink = await prisma.link.findFirst({ where: { id: BigInt(linkId), sessionId } })
  if (!currentLink) throw new Error('Link tidak ditemukan di sesi ini')

  const variants = urlVariants(url)
  const conflictingUrl = await prisma.link.findFirst({
    where: { sessionId, id: { not: BigInt(linkId) }, url: { in: variants } },
  })
  if (conflictingUrl) throw new Error('URL ini udah dipakai link lain di sesi ini')

  const allPlatforms = (await prisma.platform.findMany()).map((p) => ({
    id: p.id.toString(),
    name: p.name,
    domain: p.domain,
  }))
  const conflict = findConflictingPlatform(url, currentLink.platformId.toString(), allPlatforms)
  if (conflict) {
    throw new Error(
      `URL ini kedeteksi dari ${conflict.name}, bukan platform link ini. Kalau emang mau ganti platform, hapus link ini terus tambah ulang.`
    )
  }

  const result = await prisma.link.updateMany({
    where: { id: BigInt(linkId), sessionId },
    data: { url: url.trim(), unitId: unitId ? BigInt(unitId) : null },
  })
  if (result.count === 0) throw new Error('Link tidak ditemukan di sesi ini')
  return { id: linkId }
}

export async function deleteLink(linkId, sessionId) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.link.deleteMany({ where: { id: BigInt(linkId), sessionId } })
    if (deleted.count === 0) throw new Error('Link tidak ditemukan di sesi ini')
    await tx.rekapSession.update({ where: { id: sessionId }, data: { totalLinks: { decrement: 1 } } })
  }, { maxWait: 10000, timeout: 10000 })
}

const WEB_DEFAULT_OPERATOR_WA_ID = process.env.WEB_DEFAULT_OPERATOR_WA_ID

export async function createRekapSession({ formatId, title, dateRange }) {
  if (!formatId) throw new Error('Format wajib dipilih')
  if (!WEB_DEFAULT_OPERATOR_WA_ID) throw new Error('WEB_DEFAULT_OPERATOR_WA_ID belum di-set di .env')

  const format = await prisma.reportFormat.findUnique({ where: { id: formatId } })
  if (!format) throw new Error('Format tidak ditemukan')

  const config = format.config || {}
  if (config.requiredFields?.includes('title') && !title?.trim()) throw new Error('Judul wajib diisi untuk format ini')
  if (config.requiredFields?.includes('dateRange') && !dateRange?.trim()) throw new Error('Periode tanggal wajib diisi untuk format ini')

  const operator = await prisma.operator.upsert({
    where: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
    update: {},
    create: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
  })

  try {
    const session = await prisma.rekapSession.create({
      data: {
        formatId,
        operatorId: operator.id,
        title: title?.trim() || null,
        dateRange: dateRange?.trim() || null,
      },
    })
    return { id: session.id }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Sudah ada sesi dengan judul yang sama buat format ini')
    throw error
  }
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function insertLinksInChunks(tx, sessionId, items, chunkSize = 300) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    await tx.link.createMany({
      data: chunk.map((item) => ({
        url: item.url.trim(),
        sessionId,
        platformId: BigInt(item.platformId),
        unitId: item.unitId ? BigInt(item.unitId) : null,
      })),
    })
  }
}

function normalizeTitleForMatch(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[.,;:!?'"()\-–—]/g, '') // buang tanda baca umum (termasuk strip/dash)
    .replace(/\s+/g, ' ')            // rapetin spasi ganda jadi 1
    .trim()
}

async function findSessionByNormalizedTitle(client, formatId, title) {
  const target = normalizeTitleForMatch(title)
  if (!target) return null

  const candidates = await client.rekapSession.findMany({
    where: { formatId, title: { not: null } },
    select: { id: true, title: true, totalLinks: true },
  })

  return candidates.find((c) => normalizeTitleForMatch(c.title) === target) || null
}

async function processGroup(group, formatId, operatorId, config, dateRange, platformNameById, attempt = 0) {
  const titleTrimmed = group.title?.trim() || ''

  if (config.requiredFields?.includes('title') && !titleTrimmed) {
    throw new Error('Judul wajib diisi (ada grup tanpa judul)')
  }

  const urlValidLinks = group.links.filter((l) => isValidUrl(l.url))
  const invalidUrlSkipped = group.links.length - urlValidLinks.length

  const validLinks = urlValidLinks.filter((l) => isPlatformAllowed(platformNameById.get(l.platformId) || '', config))
  const invalidPlatformSkipped = urlValidLinks.length - validLinks.length

  if (validLinks.length === 0) {
    throw new Error(`Semua link di "${titleTrimmed || '(tanpa judul)'}" gak valid/gak sesuai format ini`)
  }

  const seenInBatch = new Set()
  const dedupedLinks = []
  let internalDuplicates = 0
  for (const link of validLinks) {
    const normalized = normalizeUrl(link.url)
    if (seenInBatch.has(normalized)) {
      internalDuplicates++
      continue
    }
    seenInBatch.add(normalized)
    dedupedLinks.push(link)
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = titleTrimmed
          ? await findSessionByNormalizedTitle(tx, formatId, titleTrimmed)
          : null

        if (existing) {
          // Dedup ke sesi existing juga dibatesin ke varian kandidat, bukan
          // narik semua url sesi itu (bisa ribuan)
          const candidateVariants = dedupedLinks.flatMap((l) => urlVariants(l.url))
          const existingLinks = await tx.link.findMany({
            where: { sessionId: existing.id, url: { in: candidateVariants } },
            select: { url: true },
          })
          const existingUrls = new Set(existingLinks.map((l) => normalizeUrl(l.url)))
          const toInsert = dedupedLinks.filter((l) => !existingUrls.has(normalizeUrl(l.url)))

          if (toInsert.length > 0) {
            await insertLinksInChunks(tx, existing.id, toInsert)
            await tx.rekapSession.update({
              where: { id: existing.id },
              data: { totalLinks: { increment: toInsert.length } },
            })
          }

          return {
            id: existing.id,
            title: titleTrimmed,
            linkCount: toInsert.length,
            skipped: dedupedLinks.length - toInsert.length + internalDuplicates,
            invalidPlatformSkipped,
            invalidUrlSkipped,
            isExisting: true,
          }
        }

        const session = await tx.rekapSession.create({
          data: {
            formatId,
            operatorId,
            title: titleTrimmed || null,
            dateRange: dateRange?.trim() || null,
            contentDate: group.contentDate ? new Date(group.contentDate) : null,
            totalLinks: dedupedLinks.length,
          },
        })

        await insertLinksInChunks(tx, session.id, dedupedLinks)

        return {
          id: session.id,
          title: titleTrimmed,
          linkCount: dedupedLinks.length,
          skipped: internalDuplicates,
          invalidPlatformSkipped,
          invalidUrlSkipped,
          isExisting: false,
        }
      },
      { timeout: 30000, maxWait: 10000 }
    )
  } catch (error) {
    if (error.code === 'P2002' && titleTrimmed && attempt < 1) {
      return processGroup(group, formatId, operatorId, config, dateRange, platformNameById, attempt + 1)
    }
    throw error
  }
}

export async function createBulkRekapSessions(formatId, groups, dateRange) {
  if (!WEB_DEFAULT_OPERATOR_WA_ID) throw new Error('WEB_DEFAULT_OPERATOR_WA_ID belum di-set di .env')
  if (!formatId) throw new Error('Format wajib dipilih')
  if (!groups || groups.length === 0) throw new Error('Minimal 1 grup artikel harus ada')

  const format = await prisma.reportFormat.findUnique({ where: { id: formatId } })
  if (!format) throw new Error('Format tidak ditemukan')

  const config = format.config || {}
  if (config.requiredFields?.includes('dateRange') && !dateRange?.trim()) {
    throw new Error('Periode tanggal wajib diisi untuk format ini')
  }

  const allPlatforms = await prisma.platform.findMany()
  const platformNameById = new Map(allPlatforms.map((p) => [p.id.toString(), p.name]))

  const operator = await prisma.operator.upsert({
    where: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
    update: {},
    create: { waId: WEB_DEFAULT_OPERATOR_WA_ID },
  })

  const results = []
  for (const group of groups) {
    if (!group.links || group.links.length === 0) continue
    try {
      const result = await processGroup(group, formatId, operator.id, config, dateRange, platformNameById)
      results.push(result)
    } catch (error) {
      results.push({ title: group.title, error: error.message, linkCount: 0, skipped: 0, isExisting: false })
    }
  }
  return results
}

// On-demand duplicate check buat Import Bulk — dipanggil dari client per
// batch grup yang lagi di-preview, BUKAN preload semua sesi+link tiap buka
// halaman (yang sebelumnya berat kalau format-nya udah numpuk banyak data)
export async function checkGroupsAgainstExistingSessions(formatId, groupSummaries) {
  const candidates = await prisma.rekapSession.findMany({
    where: { formatId, title: { not: null } },
    select: { id: true, title: true, totalLinks: true },
  })
  
  const results = []
  for (const g of groupSummaries) {
    const titleTrimmed = g.title?.trim() || ''
    if (!titleTrimmed) {
      results.push({ title: g.title, exists: false })
      continue
    }

    const target = normalizeTitleForMatch(titleTrimmed)
    const session = candidates.find((c) => normalizeTitleForMatch(c.title) === target)
    if (!session) {
      results.push({ title: g.title, exists: false })
      continue
    }

    const candidateVariants = g.urls.flatMap((u) => urlVariants(u))
    const existingLinks = await prisma.link.findMany({
      where: { sessionId: session.id, url: { in: candidateVariants } },
      select: { url: true },
    })
    const existingUrls = [...new Set(existingLinks.map((l) => normalizeUrl(l.url)))]

    results.push({
      title: g.title,
      exists: true,
      sessionId: session.id,
      totalLinks: session.totalLinks,
      existingUrls,
    })
  }
  return results
}

function orderLinks(links, config) {
  if (config.sortByPriority) {
    const priority = links.filter((l) => l.isPriority)
    const normal = links.filter((l) => !l.isPriority)
    return config.shuffle ? [...shuffleArray(priority), ...shuffleArray(normal)] : [...priority, ...normal]
  }
  return config.shuffle ? shuffleArray(links) : links
}

function buildMustacheContext({ session, stableLinks, displayLinks, pejabat, config }) {
  const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const platformOrder = []
  const unitOrderStable = []
  for (const l of stableLinks) {
    if (!platformOrder.includes(l.platform.name)) platformOrder.push(l.platform.name)
    if (l.unit && !unitOrderStable.includes(l.unit.name)) unitOrderStable.push(l.unit.name)
  }
  const unitOrder = config.shuffle ? shuffleArray(unitOrderStable) : unitOrderStable

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
      links: { include: { platform: true, unit: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!session) throw new Error('Sesi tidak ditemukan')
  if (session.links.length === 0) throw new Error('Belum ada link buat di-generate')

  const config = session.format.config || {}
  const links = session.links.filter((l) => isPlatformAllowed(l.platform.name, config))
  if (links.length === 0) throw new Error('Gak ada link yang platform-nya cocok sama daftar platform format ini')

  const displayLinks = orderLinks(links, config)
  const pejabat = await getAppConfigValue('nama_kapolresta')
  const context = buildMustacheContext({ session, stableLinks: links, displayLinks, pejabat, config })

  let text
  try {
    text = Mustache.render(session.format.template, context)
  } catch (error) {
    throw new Error(`Template error: ${error.message}`)
  }

  await prisma.rekapSession.update({
    where: { id: sessionId },
    data: { state: 'finished', completedAt: new Date(), summaryJson: { text } },
  })

  return { text }
}

export async function deleteLinks(linkIds, sessionId) {
  if (!linkIds || linkIds.length === 0) throw new Error('Gak ada link yang dipilih')

  let deletedCount = 0
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.link.deleteMany({
      where: { id: { in: linkIds.map((id) => BigInt(id)) }, sessionId },
    })
    if (deleted.count === 0) throw new Error('Link tidak ditemukan di sesi ini')
    deletedCount = deleted.count
    await tx.rekapSession.update({
      where: { id: sessionId },
      data: { totalLinks: { decrement: deleted.count } },
    })
  }, { maxWait: 10000, timeout: 10000 })

  return { deleted: deletedCount }
}