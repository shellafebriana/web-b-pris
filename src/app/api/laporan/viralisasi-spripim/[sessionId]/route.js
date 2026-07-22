import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getViralisasiSpripimData } from '@/lib/models/laporanViralisasi'
import { buildViralisasiSpripimPptx } from '@/lib/reports/viralisasiSpripimPptx'

export const runtime = 'nodejs' // pptxgenjs butuh Node runtime, bukan Edge

export async function GET(request, { params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  let data
  try {
    data = await getViralisasiSpripimData(sessionId)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const buffer = await buildViralisasiSpripimPptx(data)

  const safeTitle = (data.sessionTitle || 'laporan').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const filename = `viralisasi-spripim-${safeTitle}.pptx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}