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

    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        links: true,
      },
    })

    if (!unit) {
      return NextResponse.json(
        { error: 'Unit tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Data Unit berhasil diambil', data: unit },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET Unit detail error:', error)
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
        { error: 'Forbidden - Only admin can update unit' },
        { status: 403 }
      )
    }

    const { name, type } = await req.json()

    const unit = await prisma.unit.update({
      where: { id: parseInt(params.id) },
      data: {
        name: name || undefined,
        type: type || undefined,
      },
    })

    return NextResponse.json(
      { message: 'Unit berhasil diupdate', data: unit },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Unit tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('PUT Unit error:', error)
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
        { error: 'Forbidden - Only admin can delete unit' },
        { status: 403 }
      )
    }

    const unit = await prisma.unit.delete({
      where: { id: parseInt(params.id) },
    })

    return NextResponse.json(
      { message: 'Unit berhasil dihapus', data: unit },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Unit tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('DELETE Unit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
