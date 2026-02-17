import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Get total count
    const total = await prisma.reportFormat.count({ where })

    const formats = await prisma.reportFormat.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    })

    return NextResponse.json(
      {
        message: 'Data ReportFormat berhasil diambil',
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
        data: formats,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET ReportFormat error:', error)
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
        { error: 'Forbidden - Only admin can create format' },
        { status: 403 }
      )
    }

    const { id, name, description, template, config, isActive } = await req.json()

    // Validation
    if (!id || !name || !template || !config) {
      return NextResponse.json(
        { error: 'ID, nama, template, dan config harus diisi' },
        { status: 400 }
      )
    }

    const format = await prisma.reportFormat.create({
      data: {
        id,
        name,
        description: description || null,
        template,
        config,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(
      { message: 'ReportFormat berhasil dibuat', data: format },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST ReportFormat error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'ID ReportFormat sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
