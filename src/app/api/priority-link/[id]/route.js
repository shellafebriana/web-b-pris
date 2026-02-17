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

    const link = await prisma.priorityLink.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!link) {
      return NextResponse.json(
        { error: 'PriorityLink tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Data PriorityLink berhasil diambil', data: link },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET PriorityLink detail error:', error)
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
        { error: 'Forbidden - Only admin can update priority link' },
        { status: 403 }
      )
    }

    const { keyword, description, priority, isActive } = await req.json()

    const link = await prisma.priorityLink.update({
      where: { id: parseInt(params.id) },
      data: {
        keyword: keyword || undefined,
        description: description || undefined,
        priority: priority || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    })

    return NextResponse.json(
      { message: 'PriorityLink berhasil diupdate', data: link },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'PriorityLink tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('PUT PriorityLink error:', error)
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
        { error: 'Forbidden - Only admin can delete priority link' },
        { status: 403 }
      )
    }

    const link = await prisma.priorityLink.delete({
      where: { id: parseInt(params.id) },
    })

    return NextResponse.json(
      { message: 'PriorityLink berhasil dihapus', data: link },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'PriorityLink tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('DELETE PriorityLink error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
