import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getKamusImport, cariUrlSudahAda } from '@/lib/models/txtImport'
import { analisisTxt, saringYangSudahAda } from '@/lib/laporan/txtImport'
import { FORMAT_MEDIA_ONLINE } from '@/lib/models/laporan'
import { normalizeUrl } from '@/lib/url-utils'

export const runtime = 'nodejs'

const MAX_BYTES = 12 * 1024 * 1024

export async function POST(request) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!file || typeof file.text !== 'function') {
    return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File lebih dari 12MB' }, { status: 413 })
  }

  const raw = await file.text()
  const kamus = await getKamusImport()
  const analisis = analisisTxt(raw, kamus)

  const semuaUrl = analisis.groups.flatMap((g) => g.links.map((l) => normalizeUrl(l.url)))
  const sudahAda = await cariUrlSudahAda(FORMAT_MEDIA_ONLINE, semuaUrl)
  const { groups, dilewati } = saringYangSudahAda(analisis.groups, sudahAda)

  return NextResponse.json({
    statistik: {
      ...analisis.statistik,
      sudahAdaDiDb: dilewati,
      akanDisimpan: groups.reduce((a, g) => a + g.links.length, 0),
    },
    groups, // client jadi kurir buat commit
    ditolak: analisis.ditolak.slice(0, 100),
    ditolakTotal: analisis.ditolak.length,
    perUnitTanggal: analisis.perUnitTanggal,
    namaUnit: Object.fromEntries(kamus.units.map((u) => [u.id, u.name])),
  })
}