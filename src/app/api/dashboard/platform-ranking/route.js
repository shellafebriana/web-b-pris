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
    // STEP 3: QUERY PLATFORM RANKING (SEBULAN)
    // ==========================================
    const platformRanking = await prisma.platform.findMany({
      where: {
        // Hanya media sosial
        name: {
          in: ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'Tiktok', 'PoliceTube', 'Snack Video']
        }
      },
      include: {
        _count: {
          select: {
            links: {
              where: {
                // Filter link yang dari rekap session:
                session: {
                  createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                  },
                  // Semua format (format1-7)
                  formatId: {
                    in: ['format1', 'format2', 'format3', 'format4', 'format5', 'format6', 'format7']
                  }
                }
              }
            }
          }
        }
      }
    })

    // ==========================================
    // STEP 4: SORT & TRANSFORM RESULT
    // ==========================================
    
    // Sort by jumlah link (descending: terbanyak ke sedikit)
    const sorted = platformRanking.sort((a, b) => {
      return b._count.links - a._count.links
    })

    // Transform ke format dashboard
    const transformed = sorted.map((platform, index) => ({
      no: index + 1,
      namaPlatform: platform.name,
      jumlahLink: platform._count.links
    }))

    // ==========================================
    // STEP 5: RETURN RESPONSE
    // ==========================================
    return NextResponse.json(
      {
        message: 'Platform ranking media sosial berhasil diambil',
        data: transformed
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('GET Dashboard platform-ranking error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}