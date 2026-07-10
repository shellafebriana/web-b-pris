import prisma from '@/lib/prisma'
import { getMonthRange, getDayRange } from '@/lib/date-helpers'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

async function getActiveFormatIds() {
  const formats = await prisma.reportFormat.findMany({
    where: { isActive: true },
    select: { id: true }
  })
  return formats.map(f => f.id)
}

async function getUniqueLinkGroupedByDate(formatIds) {
  const { startOfMonth, endOfMonth } = getMonthRange()

  const links = await prisma.link.findMany({
    where: {
      session: { createdAt: { gte: startOfMonth, lte: endOfMonth }, formatId: { in: formatIds } }
    },
    select: { url: true, createdAt: true },
    distinct: ['url']
  })

  const grouped = {}
  links.forEach(link => {
    const dateStr = link.createdAt.toISOString().split('T')[0]
    if (!grouped[dateStr]) grouped[dateStr] = new Set()
    grouped[dateStr].add(link.url)
  })

  return grouped
}

function buildHeatmap(grouped) {
  return Object.entries(grouped)
    .map(([date, urls]) => ({ date, count: urls.size }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

function getCalendarWeeks(month, year) {
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Minggu ... 6=Sabtu
  const lastDay = new Date(year, month + 1, 0).getDate()
  const totalWeeks = Math.ceil((firstDayOfWeek + lastDay) / 7)

  const weeks = []
  for (let w = 0; w < totalWeeks; w++) {
    const cellStart = w * 7
    const cellEnd = cellStart + 6
    const startDay = Math.max(1, cellStart - firstDayOfWeek + 1)
    const endDay = Math.min(lastDay, cellEnd - firstDayOfWeek + 1)
    if (startDay <= lastDay) {
      weeks.push({ week: w + 1, startDay, endDay })
    }
  }
  return weeks
}

function buildWeeklyTrend(grouped, month, year) {
  const weekRanges = getCalendarWeeks(month, year)
  const monthName = MONTH_NAMES[month]

  const weekly = weekRanges.map(w => {
    let total = 0
    for (let day = w.startDay; day <= w.endDay; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      total += grouped[dateStr]?.size || 0
    }
    return {
      week: w.week,
      period: `${w.startDay} - ${w.endDay} ${monthName}`,
      count: total
    }
  })

  return weekly.map((item, index) => {
    if (index === 0) return { ...item, change: null, percentage: null }
    const prev = weekly[index - 1].count
    const change = item.count - prev
    const percentage = prev > 0 ? Math.round((change / prev) * 1000) / 10 : (item.count > 0 ? 100 : 0)
    return { ...item, change, percentage }
  })
}

export async function getTodayStats(formatIds) {
  const { startOfDay, endOfDay } = getDayRange()
  const { startOfMonth, endOfMonth } = getMonthRange()

  const [totalSesi, totalLinkSosmed, totalLinkOnline, uniqueLinks] = await Promise.all([
    prisma.rekapSession.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.link.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay }, platform: { category: 'sosmed' } }
    }),
    prisma.link.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay }, platform: { category: 'online' } }
    }),
    prisma.link.findMany({
      where: { session: { createdAt: { gte: startOfMonth, lte: endOfMonth }, formatId: { in: formatIds } } },
      distinct: ['url']
    })
  ])

  return {
    totalSesi,
    totalLinkSosmed,
    totalLinkOnline,
    totalLinkAllFormat: uniqueLinks.length
  }
}

export async function getUnitRanking() {
  const { startOfMonth, endOfMonth } = getMonthRange()

  const units = await prisma.unit.findMany({
    where: { type: 'POLSEK' },
    include: {
      _count: {
        select: {
          links: {
            where: { session: { createdAt: { gte: startOfMonth, lte: endOfMonth }, formatId: 'format1' } }
          }
        }
      }
    }
  })

  return units
    .sort((a, b) => b._count.links - a._count.links)
    .map((unit, index) => ({ no: index + 1, namaUnit: unit.name, jumlahLink: unit._count.links }))
}

export async function getPlatformRanking(formatIds) {
  const { startOfMonth, endOfMonth } = getMonthRange()

  const platforms = await prisma.platform.findMany({
    where: { category: 'sosmed' },
    include: {
      _count: {
        select: {
          links: {
            where: { session: { createdAt: { gte: startOfMonth, lte: endOfMonth }, formatId: { in: formatIds } } }
          }
        }
      }
    }
  })

  return platforms
    .sort((a, b) => b._count.links - a._count.links)
    .map((platform, index) => ({ no: index + 1, namaPlatform: platform.name, jumlahLink: platform._count.links }))
}

export async function getDashboardOverview() {
  const formatIds = await getActiveFormatIds()
  const { indonesiaTime } = getMonthRange()
  const month = indonesiaTime.getUTCMonth()
  const year = indonesiaTime.getUTCFullYear()

  const [stats, unitRanking, platformRanking, grouped] = await Promise.all([
    getTodayStats(formatIds),
    getUnitRanking(),
    getPlatformRanking(formatIds),
    getUniqueLinkGroupedByDate(formatIds),
  ])

  return {
    stats,
    unitRanking,
    platformRanking,
    heatmap: buildHeatmap(grouped),
    weeklyTrend: buildWeeklyTrend(grouped, month, year),
  }
}