import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getKamusImport, cariUrlSudahAda } from '@/lib/models/txtImport'
import { createBulkRekapSessions } from '@/lib/models/rekapSession'
import { FORMAT_MEDIA_ONLINE } from '@/lib/models/laporan'
import { detectUnitIdByUrl } from '@/lib/unit-detect'
import { detectPlatformIdWithFallback } from '@/lib/platform-detect'
import { normalizeUrl, isValidUrl } from '@/lib/url-utils'

export const runtime = 'nodejs'

const MAX_GRUP = 30

export async function POST(request) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const masuk = Array.isArray(body?.groups) ? body.groups : null
  if (!masuk?.length) return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 })
  if (masuk.length > MAX_GRUP) {
    return NextResponse.json({ error: `Maksimal ${MAX_GRUP} artikel per batch` }, { status: 400 })
  }

  // Client cuma kurir — unitId & platformId DITURUNKAN ULANG di server dari URL,
  // bukan dipercaya dari body. Kalau nggak, siapa pun bisa nyuntik link ke unit
  // mana pun lewat DevTools.
  const kamus = await getKamusImport()
  const bersih = []
  for (const g of masuk) {
    if (typeof g?.title !== 'string' || !Array.isArray(g.links)) continue
    const links = []
    for (const l of g.links) {
      if (typeof l?.url !== 'string' || !isValidUrl(l.url)) continue
      const unitId = detectUnitIdByUrl(l.url, kamus.units)
      const platformId = detectPlatformIdWithFallback(l.url, kamus.platforms)
      if (!unitId || !platformId) continue
      links.push({ url: l.url, unitId, platformId })
    }
    if (links.length === 0) continue
    bersih.push({
      title: g.title.slice(0, 500),
      contentDate: typeof g.contentDate === 'string' ? g.contentDate : null,
      links,
    })
  }
  if (bersih.length === 0) return NextResponse.json({ error: 'Tidak ada link valid' }, { status: 400 })

  // Cek ulang tepat sebelum simpan — batch sebelumnya di loop yang sama bisa
  // udah masukin URL yang sama.
  const semuaUrl = bersih.flatMap((g) => g.links.map((l) => normalizeUrl(l.url)))
  const sudahAda = await cariUrlSudahAda(FORMAT_MEDIA_ONLINE, semuaUrl)
  const final = bersih
    .map((g) => ({ ...g, links: g.links.filter((l) => !sudahAda.has(normalizeUrl(l.url))) }))
    .filter((g) => g.links.length > 0)

  if (final.length === 0) {
    return NextResponse.json({ dibuat: 0, ditambah: 0, link: 0, dilewati: semuaUrl.length, gagal: 0 })
  }

  const hasil = await createBulkRekapSessions(FORMAT_MEDIA_ONLINE, final, null)

  return NextResponse.json({
    dibuat: hasil.filter((r) => !r.error && !r.isExisting).length,
    ditambah: hasil.filter((r) => !r.error && r.isExisting).length,
    link: hasil.reduce((a, r) => a + (r.linkCount || 0), 0),
    dilewati: hasil.reduce((a, r) => a + (r.skipped || 0), 0),
    gagal: hasil.filter((r) => r.error).length,
    error: hasil.filter((r) => r.error).slice(0, 5).map((r) => `${r.title}: ${r.error}`),
  })
}