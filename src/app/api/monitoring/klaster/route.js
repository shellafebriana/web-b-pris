import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { perbaruiKlaster } from '@/lib/models/monitoring'

export const maxDuration = 60

// Route Handler TIDAK keprotect layout — auth wajib dicek ulang di sini.
export async function POST(request) {
  const rahasia = request.headers.get('x-cron-secret')
  const cronSah = process.env.CRON_SECRET && rahasia === process.env.CRON_SECRET

  if (!cronSah) {
    const user = await getAuthUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const n = Number(searchParams.get('hari'))
  // Whitelist: jangan biarkan angka dari URL menentukan beban query.
  const hari = Number.isFinite(n) && n >= 1 && n <= 60 ? n : 14

  try {
    const hasil = await perbaruiKlaster({ hari })
    return NextResponse.json({ ...hasil, hari })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}