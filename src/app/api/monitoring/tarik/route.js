import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { tarikKandidat, getSumberAktif } from '@/lib/models/monitoring'

// Vercel Hobby membatasi 10 detik, Pro 60 detik. Karena itu satu permintaan
// hanya menarik SATU sumber — klien yang mengulang untuk sumber berikutnya.
export const maxDuration = 60

async function izinkan(request) {
  const rahasia = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && rahasia === process.env.CRON_SECRET) return true
  const user = await getAuthUser()
  return Boolean(user && user.role === 'admin')
}

export async function GET(request) {
  if (!(await izinkan(request))) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
  }
  return NextResponse.json({ sumber: await getSumberAktif() })
}

export async function POST(request) {
  if (!(await izinkan(request))) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    const hasil = await tarikKandidat({ sumberId: id || null })
    return NextResponse.json(hasil)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}