import { NextResponse } from 'next/server'
// Mengimpor auth juga memasang BigInt.prototype.toJSON, jadi NextResponse.json
// aman walau ada BigInt yang lolos dari Model.
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// Helper bersama Route Handler /api/*. Route hanya mengurus HTTP
// (token, status, bentuk JSON); validasi dan aturan data tetap di Model,
// sama persis dengan yang dipakai Server Action form admin.

export function cekAuth(req, { wajibAdmin = false } = {}) {
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

export function ok(data, message, status = 200) {
  return NextResponse.json({ message, data }, { status })
}

// Untuk daftar: tambahan seperti pagination/total ditaruh sejajar dengan data
export function okDaftar(data, message, tambahan = {}) {
  return NextResponse.json({ message, data, ...tambahan }, { status: 200 })
}

export function tidakDitemukan(message) {
  return NextResponse.json({ error: message }, { status: 404 })
}

// Error dari Model = Error biasa berisi pesan untuk manusia -> 400
// (404 kalau pesannya "tidak ditemukan"). Error Prisma atau error lain yang
// punya `code` = kesalahan tak terduga -> 500, detailnya hanya ke log.
export function gagal(error, konteks) {
  const dariModel = error instanceof Error && !error.code && !String(error.name).startsWith('Prisma')
  if (dariModel) {
    const status = /tidak ditemukan/i.test(error.message) ? 404 : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  console.error(`${konteks} error:`, error)
  return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
}

// ID BigInt dari URL. Nilai bukan angka dianggap tidak ada (404),
// bukan dibiarkan jadi SyntaxError dari BigInt().
export function idAngka(id) {
  return typeof id === 'string' && /^\d+$/.test(id) ? id : null
}

export async function bacaJson(req) {
  try {
    return await req.json()
  } catch {
    throw new Error('Body permintaan harus berupa JSON yang valid')
  }
}