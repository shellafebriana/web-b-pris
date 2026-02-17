import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { parseQuery } from '@/lib/middleware'

export async function GET(req) {
    try{
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
        const now = new Date()
        const indonesiaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))

        
        const startOfDay = new Date(
            indonesiaTime.getUTCFullYear(),
            indonesiaTime.getUTCMonth(),
            indonesiaTime.getUTCDate(),
            0, 0, 0
        )

        
        const endOfDay = new Date(
            indonesiaTime.getUTCFullYear(),
            indonesiaTime.getUTCMonth(),
            indonesiaTime.getUTCDate(),
            23, 59, 59
        )

        // ===== BULANAN (1 - akhir bulan) =====
        const startOfMonth = new Date(
            indonesiaTime.getUTCFullYear(),
            indonesiaTime.getUTCMonth(),
            1,
            0, 0, 0
        )
        
        const endOfMonth = new Date(
            indonesiaTime.getUTCFullYear(),
            indonesiaTime.getUTCMonth() + 1,
            0,
            23, 59, 59
        )
    
        // Step 2: Count RekapSession hari ini
        const totalSesi = await prisma.rekapSession.count({
            where: {
                createdAt: {
                gte: startOfDay,
                lte: endOfDay
                }
            }
        })
    
        // Step 3: Count Link media sosial hari ini
        const totalLinkSosmed = await prisma.link.count({
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                platform: {
                name: { in: ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'Tiktok', 'PoliceTube', 'Snack Video'] }
                }
            }
        })
    
        // Step 4: Count Link media online hari ini
        const totalLinkOnline = await prisma.link.count({
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                platform: {
                name: { in: ['Lainnya', 'Web Humas', 'Web Tribata'] }
                }
            }
        })

        const uniqueLinks = await prisma.link.findMany({
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
            distinct: ['url']  // Hanya ambil unique by URL
        })

        const totalLinkAllFormat = uniqueLinks.length
        // Return
        return NextResponse.json(
            { 
                message: 'Dashboard today stats berhasil diambil',
                data: {
                    totalSesi,
                    totalLinkSosmed,
                    totalLinkOnline,
                    totalLinkAllFormat
                }
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('GET Today Stats error:', error)
        return NextResponse.json(
            { error: 'Terjadi kesalahan', details: error.message },
            { status: 500 }
        )
    }
}