import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(req) {
  try {
    // ==========================================
    // STEP 1: AUTHENTICATION CHECK
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
    // STEP 2: CALCULATE DATE RANGE (BULANAN - UTC+7)
    // ==========================================
    const now = new Date()
    
    const indonesiaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    
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
    // STEP 3: QUERY SEMUA LINK SEBULAN
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
        },
      },
      select: {
        url: true,
        createdAt: true
      },
      distinct: ['url']  // Hanya ambil unique by URL
    })

    // ==========================================
    // STEP 4: GROUP BY DATE & COUNT UNIQUE
    // ==========================================
    
    const groupedByDate = {}

    allLinks.forEach(link => {
      // Convert createdAt ke format date saja (YYYY-MM-DD)
      const dateStr = link.createdAt.toISOString().split('T')[0]
      
      // Jika date belum ada di object, buat Set baru
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = new Set()
      }
      
      // Tambah URL ke Set (Set otomatis handle unique)
      groupedByDate[dateStr].add(link.url)
    })

    // Convert ke array format
    const heatmapData = Object.entries(groupedByDate).map(([date, urls]) => ({
      date,
      count: urls.size  // size = jumlah unique URL
    }))

    // ==========================================
    // STEP 5: SORT & RETURN RESPONSE
    // ==========================================
    
    const sorted = heatmapData.sort((a, b) => {
      return new Date(a.date) - new Date(b.date)
    })

    return NextResponse.json(
      {
        message: 'Heatmap calendar berhasil diambil',
        data: sorted
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('GET Dashboard heatmap-calendar error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}