import { NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getUnitById, updateUnit, deleteUnit } from '@/lib/models/unit'

// Token dicek per-request; Route Handler tidak melewati layout admin.
function cekAuth(req, { wajibAdmin = false } = {}) {
  const token = getTokenFromHeader(req.headers.get('authorization'))
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }) }
  }

  const verification = verifyToken(token)
  if (!verification.valid) {
    return { error: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }) }
  }

  if (wajibAdmin && verification.data.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden - Only admin allowed' }, { status: 403 }) }
  }

  return { user: verification.data }
}

export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    // params adalah Promise di Next 15+; tanpa await nilainya undefined.
    const { id } = await params
    const unit = await getUnitById(id)

    if (!unit) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Data Unit berhasil diambil', data: unit }, { status: 200 })
  } catch (error) {
    console.error('GET Unit detail error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan', details: error.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const { name, type, domains, aliases, rayon } = await req.json()

    const unit = await updateUnit(id, { name, type, domains, aliases, rayon })

    return NextResponse.json({ message: 'Unit berhasil diupdate', data: unit }, { status: 200 })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
    }
    console.error('PUT Unit error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    await deleteUnit(id)

    return NextResponse.json({ message: 'Unit berhasil dihapus' }, { status: 200 })
  } catch (error) {
    console.error('DELETE Unit error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}