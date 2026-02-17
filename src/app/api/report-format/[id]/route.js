import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const format = await prisma.reportFormat.findUnique({
      where: { id: params.id },
      include: { sessions: true },
    })

    if (!format) {
      return NextResponse.json(
        { error: 'ReportFormat tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Data ReportFormat berhasil diambil', data: format },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET ReportFormat detail error:', error)
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

    if (verification.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admin can update format' },
        { status: 403 }
      )
    }

    const { name, description, template, config, isActive } = await req.json()

    const format = await prisma.reportFormat.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        description: description || undefined,
        template: template || undefined,
        config: config || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    })

    return NextResponse.json(
      { message: 'ReportFormat berhasil diupdate', data: format },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'ReportFormat tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('PUT ReportFormat error:', error)
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

    if (verification.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admin can delete format' },
        { status: 403 }
      )
    }

    const format = await prisma.reportFormat.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'ReportFormat berhasil dihapus', data: format },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'ReportFormat tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('DELETE ReportFormat error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
