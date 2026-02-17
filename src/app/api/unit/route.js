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
    const { limit, skip, search, sortBy, sortOrder } = parseQuery(searchParams)
    const type = searchParams.get('type')

    // Build where clause
    const where = {}
    if (search) {
      where.name = { contains: search }
    }
    if (type) {
      where.type = type
    }

    // Get total count
    const total = await prisma.unit.count({ where })

    const units = await prisma.unit.findMany({
      where,
      include: {
        _count: {
          select: { links: true },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    })

    return NextResponse.json(
      {
        message: 'Data Unit berhasil diambil',
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
        data: units,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET Unit error:', error)
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
        { error: 'Forbidden - Only admin can create unit' },
        { status: 403 }
      )
    }

    const { name, type } = await req.json()

    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nama dan type unit harus diisi' },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        type,
      },
    })

    return NextResponse.json(
      { message: 'Unit berhasil dibuat', data: unit },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST Unit error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nama unit sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
