import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(req, { params }) {
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

    const session = await prisma.rekapSession.findUnique({
      where: { id: params.id },
      include: {
        operator: true,
        format: true,
        links: {
          include: {
            platform: true,
            unit: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'RekapSession tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Data RekapSession berhasil diambil', data: session },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET RekapSession detail error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(req, { params }) {
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

    const { title, dateRange, state, summaryJson } = await req.json()

    // Check if session exists
    const existingSession = await prisma.rekapSession.findUnique({
      where: { id: params.id },
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'RekapSession tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check authorization - only operator owner or admin can update
    if (
      verification.data.role !== 'admin' &&
      existingSession.operatorId !== verification.data.operatorId
    ) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own sessions' },
        { status: 403 }
      )
    }

    const session = await prisma.rekapSession.update({
      where: { id: params.id },
      data: {
        title: title || undefined,
        dateRange: dateRange || undefined,
        state: state || undefined,
        summaryJson: summaryJson || undefined,
      },
      include: {
        operator: true,
        format: true,
        links: true,
      },
    })

    return NextResponse.json(
      { message: 'RekapSession berhasil diupdate', data: session },
      { status: 200 }
    )
  } catch (error) {
    console.error('PUT RekapSession error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req, { params }) {
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

    // Check if session exists
    const existingSession = await prisma.rekapSession.findUnique({
      where: { id: params.id },
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'RekapSession tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check authorization
    if (
      verification.data.role !== 'admin' &&
      existingSession.operatorId !== verification.data.operatorId
    ) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own sessions' },
        { status: 403 }
      )
    }

    const session = await prisma.rekapSession.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'RekapSession berhasil dihapus', data: session },
      { status: 200 }
    )
  } catch (error) {
    console.error('DELETE RekapSession error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
