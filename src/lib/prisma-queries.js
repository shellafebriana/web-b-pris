import prisma from '@/lib/prisma';

/**
 * Get Unit Performance (per POLSEK per bulan)
 */
export async function getUnitPerformance(startDate, endDate) {
  try {
    const result = await prisma.link.groupBy({
      by: ['unitId'],
      where: {
        unit: { type: 'POLSEK' },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' }
      }
    });

    // Fetch unit names
    const unitIds = result.map(r => r.unitId);
    const units = await prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, name: true }
    });

    const unitMap = Object.fromEntries(units.map(u => [u.id, u.name]));

    return result.map(r => ({
      unitName: unitMap[r.unitId] || 'Unknown',
      totalLinks: r._count.id
    }));
  } catch (error) {
    console.error('Error in getUnitPerformance:', error);
    throw error;
  }
}

/**
 * Get Domain Analytics (platform "Lainnya" breakdown)
 * Returns: { domain: "radarblambangan.com", count: 12 }[]
 */
export async function getDomainAnalytics(startDate, endDate) {
  try {
    const links = await prisma.link.findMany({
      where: {
        platform: { name: 'Lainnya' },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        session: { state: 'finished' }
      },
      select: { url: true }
    });

    // Extract domain dari URL & aggregate
    const domainCount = {};
    links.forEach(link => {
      try {
        const domain = new URL(link.url).hostname;
        domainCount[domain] = (domainCount[domain] || 0) + 1;
      } catch (e) {
        console.error('Invalid URL:', link.url);
      }
    });

    // Convert ke array dan sort by count descending
    const result = Object.entries(domainCount)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    return result;
  } catch (error) {
    console.error('Error in getDomainAnalytics:', error);
    throw error;
  }
}

/**
 * Get Daily Links (aggregate per hari)
 * Returns: { date: "2026-01-01", totalLinks: 120 }[]
 */
export async function getDailyLinks(startDate, endDate) {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        COUNT(id) as totalLinks
      FROM Link
      WHERE createdAt BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}
        AND sessionId IN (
          SELECT id FROM RekapSession WHERE state = 'finished'
        )
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;

    // Format result
    return result.map(r => ({
      date: new Date(r.date).toISOString().split('T')[0],
      totalLinks: Number(r.totalLinks)
    }));
  } catch (error) {
    console.error('Error in getDailyLinks:', error);
    throw error;
  }
}

/**
 * Get All Dashboard Data (combined)
 */
export async function getAllDashboardData(startDate, endDate) {
  try {
    const [unitPerformance, domainAnalytics, dailyLinks] = await Promise.all([
      getUnitPerformance(startDate, endDate),
      getDomainAnalytics(startDate, endDate),
      getDailyLinks(startDate, endDate)
    ]);

    return {
      unitPerformance,
      domainAnalytics,
      dailyLinks,
      dateRange: { startDate, endDate },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getAllDashboardData:', error);
    throw error;
  }
}
