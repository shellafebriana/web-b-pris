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
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where = {}
    if (search) {
      where.OR = [
        { keyword: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Get total count
    const total = await prisma.priorityLink.count({ where })

    const links = await prisma.priorityLink.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy === 'priority' ? 'priority' : sortBy]: sortOrder },
    })

    return NextResponse.json(
      {
        message: 'Data PriorityLink berhasil diambil',
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
        data: links,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET PriorityLink error:', error)
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
        { error: 'Forbidden - Only admin can create priority link' },
        { status: 403 }
      )
    }

    const { keyword, description, priority, isActive } = await req.json()

    // Validation
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword harus diisi' },
        { status: 400 }
      )
    }

    const link = await prisma.priorityLink.create({
      data: {
        keyword,
        description: description || null,
        priority: priority || 999,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(
      { message: 'PriorityLink berhasil dibuat', data: link },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST PriorityLink error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Keyword sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
