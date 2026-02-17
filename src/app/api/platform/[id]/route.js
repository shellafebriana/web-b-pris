import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(req, { params }) {
  const resolvedParams = await params 
  const id = resolvedParams.id
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

    const platform = await prisma.platform.findUnique({
      where: { id: parseInt(id) },
      include: {
        links: true,
      },
    })

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Data Platform berhasil diambil', data: platform },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET Platform detail error:', error)
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
        { error: 'Forbidden - Only admin can update platform' },
        { status: 403 }
      )
    }

    const { name, domain } = await req.json()

    const platform = await prisma.platform.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        domain: domain || undefined,
      },
    })

    return NextResponse.json(
      { message: 'Platform berhasil diupdate', data: platform },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Platform tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('PUT Platform error:', error)
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
        { error: 'Forbidden - Only admin can delete platform' },
        { status: 403 }
      )
    }

    const platform = await prisma.platform.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Platform berhasil dihapus', data: platform },
      { status: 200 }
    )
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Platform tidak ditemukan' },
        { status: 404 }
      )
    }
    console.error('DELETE Platform error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}
