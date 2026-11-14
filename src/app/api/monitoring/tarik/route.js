import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { tarikKandidat, getSumberAktif } from '@/lib/models/monitoring'

// Batas durasi fungsi Vercel saat ini 300 detik (Hobby maupun Pro).
export const maxDuration = 300

// Cron berhenti memulai sumber baru setelah 240 detik. Sisa waktunya cukup
// untuk menyelesaikan sumber terakhir, karena setiap permintaan ke sumber
// dibatasi 12 detik di crawler.
const BATAS_WAKTU_CRON_MS = 240_000

function samaAman(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// Vercel Cron mengirim header `Authorization: Bearer <CRON_SECRET>`.
// Header `x-cron-secret` tetap diterima untuk pemanggilan manual cara lama.
function dariCron(request) {
  const rahasia = process.env.CRON_SECRET
  if (!rahasia) return false
  return (
    samaAman(request.headers.get('authorization'), `Bearer ${rahasia}`) ||
    samaAman(request.headers.get('x-cron-secret'), rahasia)
  )
}

async function dariAdmin() {
  const user = await getAuthUser()
  return Boolean(user && user.role === 'admin')
}

// GET dipanggil oleh dua pihak:
// - Vercel Cron (sekali sehari, sekitar 06.00–06.59 WIB): langsung menarik
//   semua sumber aktif.
// - Panel Kandidat di halaman Monitoring (admin): hanya mengambil daftar
//   sumber, lalu menarik satu per satu lewat POST supaya progresnya terlihat.
export async function GET(request) {
  if (dariCron(request)) {
    try {
      const hasil = await tarikKandidat({ batasWaktuMs: BATAS_WAKTU_CRON_MS })
      console.log('[cron monitoring] selesai:', hasil)
      return NextResponse.json(hasil)
    } catch (error) {
      console.error('[cron monitoring] gagal:', error)
      return NextResponse.json({ error: 'Penarikan otomatis gagal' }, { status: 500 })
    }
  }

  if (!(await dariAdmin())) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
  }
  return NextResponse.json({ sumber: await getSumberAktif() })
}

export async function POST(request) {
  if (!dariCron(request) && !(await dariAdmin())) {
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