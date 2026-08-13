import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { tarikKandidat } from '@/lib/models/monitoring'

export const maxDuration = 60

// Route Handler TIDAK keprotect layout — auth wajib dicek ulang di sini.
export async function POST(request) {
  const user = await getAuthUser()

  // Jalur cron: header rahasia, dipakai kalau tidak ada sesi login.
  const rahasia = request.headers.get('x-cron-secret')
  const cronSah = process.env.CRON_SECRET && rahasia === process.env.CRON_SECRET

  if (!cronSah && (!user || user.role !== 'admin')) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
  }

  try {
    const hasil = await tarikKandidat()
    return NextResponse.json(hasil)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}