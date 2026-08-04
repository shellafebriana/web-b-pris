import { NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { getAuthUser } from '@/lib/auth'
import { parsePeriode } from '@/lib/laporan/periode'
import { getRekapMediaSosial, getFormatMedsos, FORMAT_MEDSOS } from '@/lib/models/laporan'
import { buildRekapMedsosXlsx } from '@/lib/reports/rekapMedsosXlsx'
import { buildRekapMedsosElement, ukuranGambar } from '@/lib/reports/rekapMedsosImage'

export const runtime = 'nodejs' // exceljs butuh Node runtime

const TIPE_VALID = ['xlsx', 'png']

export async function GET(request) {
  // Route handler TIDAK keprotect layout (admin) — auth wajib dicek di sini juga.
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  if (!TIPE_VALID.includes(type)) {
    return NextResponse.json({ error: 'Tipe export tidak valid' }, { status: 400 })
  }

  const format = await getFormatMedsos()
  if (!format || !format.isActive) {
    return NextResponse.json(
      { error: `Format sumber (${FORMAT_MEDSOS}) tidak tersedia` },
      { status: 400 }
    )
  }

  // parsePeriode() sudah memvalidasi ketat; input ngawur jatuh ke periode sekarang.
  const periode = parsePeriode({ mode: sp.get('mode'), periode: sp.get('periode') })

  const data = await getRekapMediaSosial({
    formatIds: [FORMAT_MEDSOS],
    start: periode.start,
    end: periode.end,
  })

  if (!data.adaData) {
    return NextResponse.json(
      { error: 'Tidak ada data untuk periode ini' },
      { status: 404 }
    )
  }

  const namaFile = `rekap-media-sosial-${periode.periode}`.replace(/[^a-z0-9-]/gi, '')

  if (type === 'xlsx') {
    const buffer = await buildRekapMedsosXlsx({ data, labelJudul: periode.labelJudul })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFile}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const { width, height } = ukuranGambar({ data })
  const img = new ImageResponse(
    buildRekapMedsosElement({ data, labelJudul: periode.labelJudul }),
    { width, height }
    // Kalau ImageResponse protes soal font, taruh TTF di public/fonts lalu tambah:
    // , { width, height, fonts: [{ name: 'Inter', data: fontBuffer, weight: 400, style: 'normal' }] }
  )

  return new NextResponse(img.body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${namaFile}.png"`,
      'Cache-Control': 'no-store',
    },
  })
}