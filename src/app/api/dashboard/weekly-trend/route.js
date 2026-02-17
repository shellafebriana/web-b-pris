import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(req) {
  try {
    // ==========================================
    // STEP 1: AUTHENTICATION
    // ==========================================
    const authHeader = req.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const verification = verifyToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // ==========================================
    // STEP 2: CALCULATE DATE RANGE (EXACT SAME AS HEATMAP!)
    // ==========================================
    const now = new Date()
    const indonesiaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))

    const month = indonesiaTime.getUTCMonth()
    const year = indonesiaTime.getUTCFullYear()

    // Start of month: tanggal 1, 00:00:00
    const startOfMonth = new Date(
      indonesiaTime.getUTCFullYear(),
      indonesiaTime.getUTCMonth(),
      1,
      0, 0, 0
    )
    
    // End of month: tanggal terakhir, 23:59:59
    const endOfMonth = new Date(
      indonesiaTime.getUTCFullYear(),
      indonesiaTime.getUTCMonth() + 1,
      0,
      23, 59, 59
    )

    // ==========================================
    // STEP 3: QUERY SEMUA LINK SEBULAN (SAME AS HEATMAP!)
    // ==========================================
    const allLinks = await prisma.link.findMany({
      where: {
        session: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          formatId: {
            in: ['format1', 'format2', 'format3', 'format4', 'format5', 'format6', 'format7']
          }
        }
      },
      select: {
        url: true,
        createdAt: true
      },
      distinct: ['url']
    })

    // ==========================================
    // STEP 4: GROUP BY DATE (SAME AS HEATMAP!)
    // ==========================================
    const groupedByDate = {}

    allLinks.forEach(link => {
      const dateStr = link.createdAt.toISOString().split('T')[0]
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = new Set()
      }
      
      groupedByDate[dateStr].add(link.url)
    })

    // ==========================================
    // STEP 5: HELPER FUNCTIONS
    // ==========================================
    const getMonthName = (monthIndex) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      return months[monthIndex]
    }

    const formatLabel = (startDay, endDay, currentMonth, currentYear) => {
      const startMonth = getMonthName(currentMonth)
      
      if (endDay < startDay) {
        // Cross bulan (misal 29 Feb - 4 Mar)
        const endMonth = getMonthName((currentMonth + 1) % 12)
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
      } else {
        // Same month
        return `${startDay} - ${endDay} ${startMonth}`
      }
    }

    // ==========================================
    // STEP 6: DEFINE WEEK BOUNDARIES
    // ==========================================
    const lastDayOfMonth = new Date(year, month + 1, 0).getUTCDate()

    const weekDays = [
      { week: 1, startDay: 1, endDay: 7 },
      { week: 2, startDay: 8, endDay: 14 },
      { week: 3, startDay: 15, endDay: 21 },
      { week: 4, startDay: 22, endDay: 28 },
      { week: 5, startDay: 29, endDay: lastDayOfMonth }
    ]

    const validWeeks = weekDays.filter(w => w.startDay <= lastDayOfMonth)

    // ==========================================
    // STEP 7: SUM DAILY UNIQUE PER WEEK
    // ==========================================
    const weeklyData = validWeeks.map(w => {
      let totalCount = 0

      // Loop setiap hari dalam minggu
      for (let day = w.startDay; day <= w.endDay; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const dailyUnique = groupedByDate[dateStr]?.size || 0
        totalCount += dailyUnique
      }

      return {
        week: w.week,
        period: formatLabel(w.startDay, w.endDay, month, year),
        count: totalCount
      }
    })

    // ==========================================
    // STEP 8: CALCULATE PERCENTAGE CHANGE
    // ==========================================
    const withChange = weeklyData.map((item, index) => {
      let change = null
      let percentage = null
      
      if (index > 0) {
        const prevCount = weeklyData[index - 1].count
        change = item.count - prevCount
        
        if (prevCount > 0) {
          percentage = Math.round((change / prevCount) * 100 * 10) / 10
        } else if (prevCount === 0 && item.count > 0) {
          percentage = 100
        } else {
          percentage = 0
        }
      }
      
      return {
        week: item.week,
        period: item.period,
        count: item.count,
        change,
        percentage
      }
    })

    // ==========================================
    // STEP 9: RETURN RESPONSE
    // ==========================================
    return NextResponse.json(
      {
        message: 'Weekly trend berhasil diambil',
        data: withChange
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('GET Dashboard weekly-trend error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}