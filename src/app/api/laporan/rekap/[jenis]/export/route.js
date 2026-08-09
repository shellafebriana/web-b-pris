import { NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { getAuthUser } from '@/lib/auth'
import { parsePeriode } from '@/lib/laporan/periode'
import { JENIS_LAPORAN } from '@/lib/laporan/registry'
import { getFormatLaporan } from '@/lib/models/laporan'
import { buildRekapXlsx } from '@/lib/reports/rekapXlsx'
import { buildRekapElement, ukuranGambar } from '@/lib/reports/rekapImage'

export const runtime = 'nodejs' // exceljs butuh Node runtime

const TIPE_VALID = ['xlsx', 'png']

export async function GET(request, { params }) {
  // Route handler TIDAK keprotect layout (admin) — auth wajib dicek di sini juga.
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jenis } = await params
  const cfg = JENIS_LAPORAN[jenis]
  if (!cfg) return NextResponse.json({ error: 'Jenis laporan tidak dikenal' }, { status: 404 })

  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  if (!TIPE_VALID.includes(type)) {
    return NextResponse.json({ error: 'Tipe export tidak valid' }, { status: 400 })
  }

  if (cfg.formatId) {
    const format = await getFormatLaporan(cfg.formatId)
    if (!format || !format.isActive) {
      return NextResponse.json(
        { error: `Format sumber (${cfg.formatId}) tidak tersedia` },
        { status: 400 }
      )
    }
  }

  // parsePeriode() memvalidasi ketat; input ngawur jatuh ke periode sekarang.
  const periode = parsePeriode({ mode: sp.get('mode'), periode: sp.get('periode') })
  const data = await cfg.ambil({ formatIds: cfg.formatId ? [cfg.formatId] : [], periode })

  if (!data.adaData) {
    return NextResponse.json({ error: 'Tidak ada data untuk periode ini' }, { status: 404 })
  }

  const namaFile = `${cfg.namaFile}-${periode.periode}`.replace(/[^a-z0-9-]/gi, '')
  const opsi = { data, judulCetak: cfg.judulCetak, labelJudul: periode.labelJudul, kolomEntitas: cfg.kolomEntitas }

  if (type === 'xlsx') {
    const buffer = await buildRekapXlsx(opsi)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFile}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const img = new ImageResponse(buildRekapElement(opsi), ukuranGambar({ data }))
  return new NextResponse(img.body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${namaFile}.png"`,
      'Cache-Control': 'no-store',
    },
  })
}