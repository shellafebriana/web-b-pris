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
    // STEP 2: CALCULATE DATE RANGE (1 BULAN - UTC+7)
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
    // STEP 3: QUERY UNIT RANKING (SEBULAN)
    // ==========================================
    const unitRanking = await prisma.unit.findMany({
      where: {
        type: 'polsek'  // Hanya unit type polsek
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
                  formatId: 'format1'  // Format 1 saja
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
    const sorted = unitRanking.sort((a, b) => {
      return b._count.links - a._count.links
    })

    // Transform ke format dashboard
    const transformed = sorted.map((unit, index) => ({
      no: index + 1,
      namaUnit: unit.name,
      jumlahLink: unit._count.links
    }))

    // ==========================================
    // STEP 5: RETURN RESPONSE
    // ==========================================
    return NextResponse.json(
      {
        message: 'Unit ranking sebulan berhasil diambil',
        data: transformed
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('GET Dashboard unit-ranking error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}