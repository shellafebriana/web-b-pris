import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { analisisRilis } from '@/lib/rilis-parser'
import { getUnitsUntukRilis, cariFingerprintAda, simpanRilis } from '@/lib/models/rilis'

export const runtime = 'nodejs'

const MAX_BYTES = 12 * 1024 * 1024
const MAX_FILE = 12

/** Rayon ditebak dari nama file: "...RAYON_5..." atau "...RAYON V...". */
function tebakRayon(nama) {
  const m = /RAYON[_\s-]*(\d{1,2}|[IVX]+)/i.exec(nama || '')
  if (!m) return null
  const v = m[1].toUpperCase()
  if (/^\d+$/.test(v)) return Number(v)
  return { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 }[v] ?? null
}

export async function POST(request) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData()
  const files = form.getAll('file').filter((f) => typeof f?.text === 'function')
  const aksi = form.get('aksi') === 'simpan' ? 'simpan' : 'preview'

  // Pemetaan manual dari preview: { kunciPesan: unitId }
  let pemetaan = {}
  try {
    const raw = form.get('pemetaan')
    if (typeof raw === 'string' && raw) pemetaan = JSON.parse(raw)
  } catch { pemetaan = {} }
  if (typeof pemetaan !== 'object' || pemetaan === null) pemetaan = {}

  if (!files.length) return NextResponse.json({ error: 'File belum dipilih' }, { status: 400 })
  if (files.length > MAX_FILE) {
    return NextResponse.json({ error: `Maksimal ${MAX_FILE} file` }, { status: 400 })
  }
  if (files.some((f) => f.size > MAX_BYTES)) {
    return NextResponse.json({ error: 'Ada file lebih dari 12MB' }, { status: 413 })
  }

  const units = await getUnitsUntukRilis()

  // Dedup lintas file: rilis yang sama bisa dikirim ke grup Bahan Viral DAN
  // grup rayon. fingerprint tidak mengandung rayon, jadi tetap ketangkep.
  const semua = new Map()
  const perluTinjau = []
  const perFile = []

  for (const f of files) {
    const raw = await f.text()
    const rayon = tebakRayon(f.name)
    const hasil = analisisRilis(raw, { units, rayon, pemetaan })
    for (const r of hasil.rilis) if (!semua.has(r.fingerprint)) semua.set(r.fingerprint, r)
    perluTinjau.push(...hasil.perluTinjau.map((t) => ({ ...t, file: f.name })))
    perFile.push({ nama: f.name, rayon, ...hasil.stat })
  }

  const daftar = [...semua.values()]
  const sudahAda = await cariFingerprintAda(daftar.map((r) => r.fingerprint))
  const baru = daftar.filter((r) => !sudahAda.has(r.fingerprint))

  if (aksi === 'preview') {
    const perUnit = {}
    for (const r of baru) {
      perUnit[r.unitName] ??= { baru: 0, tanggal: new Set() }
      perUnit[r.unitName].baru++
      perUnit[r.unitName].tanggal.add(`${r.tanggal.m}-${r.tanggal.d}`)
    }
    return NextResponse.json({
      perFile,
      total: daftar.length,
      sudahAda: daftar.length - baru.length,
      akanDisimpan: baru.length,
      perluTinjau: perluTinjau.slice(0, 40),
      perluTinjauTotal: perluTinjau.length,
      dariManual: baru.filter((r) => r.metode === 'manual').length,
      units: units.map((u) => ({ id: u.id, name: u.name })),
      perUnit: Object.fromEntries(
        Object.entries(perUnit).map(([k, v]) => [k, { baru: v.baru, hari: v.tanggal.size }])
      ),
    })
  }

  const { dibuat } = await simpanRilis(
    baru.map((r) => ({
      unitId: BigInt(r.unitId),
      contentDate: new Date(
        `${r.tanggal.y}-${String(r.tanggal.m).padStart(2, '0')}-${String(r.tanggal.d).padStart(2, '0')}T00:00:00.000+07:00`
      ),
      rayon: r.rayon,
      pengirim: r.pengirim?.slice(0, 255) || null,
      metode: r.metode,
      fingerprint: r.fingerprint,
    }))
  )

  return NextResponse.json({ dibuat, dilewati: daftar.length - baru.length })
}