import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { parseQuery } from '@/lib/middleware'

export async function GET(req) {
  try {
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

    const { searchParams } = new URL(req.url)
    const { limit, skip, search } = parseQuery(searchParams)
    

    // Build where clause
    const where = {}
    if (search) {
      where.name = { contains: search }
    }

    // Get total count
    const total = await prisma.platform.count({ where })

    const platforms = await prisma.platform.findMany({
      where,
      include: {
        _count: {
          select: { links: true },
        },
      },
      skip,
      take: limit,
    })

    return NextResponse.json(
      {
        message: 'Data Platform berhasil diambil',
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
        data: platforms,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET Platform error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  try {
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

    if (verification.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admin can create platform' },
        { status: 403 }
      )
    }

    const { name, domain, category } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nama platform harus diisi' },
        { status: 400 }
      )
    }

    if (category && !['sosmed', 'online'].includes(category)) {
      return NextResponse.json(
        { error: 'Category harus salah satu dari: sosmed, online' },
        { status: 400 }
      )
    }

    const platform = await prisma.platform.create({
      data: {
        name,
        domain: domain || null,
        category: category || 'online',
      },
    })

    return NextResponse.json(
      { message: 'Platform berhasil dibuat', data: platform },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST Platform error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nama platform sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
