import prisma from '@/lib/prisma'
import { komponenWib } from '@/lib/laporan/periode'
import { FORMAT_MEDIA_SOSIAL, FORMAT_MEDIA_ONLINE } from '@/lib/models/laporan'
import { getUnitRankingSocial } from '@/lib/models/dashboard'

// domains/aliases disimpan sebagai Json. Dibersihkan di sini supaya baik form
// maupun API lama menghasilkan bentuk yang sama: array string, tanpa duplikat.
function bersihkanDaftar(nilai, { kecilkan = false } = {}) {
  if (!Array.isArray(nilai)) return []
  const hasil = []
  for (const v of nilai) {
    if (typeof v !== 'string') continue
    const teks = kecilkan ? v.trim().toLowerCase() : v.trim()
    if (teks && !hasil.includes(teks)) hasil.push(teks)
  }
  return hasil
}

// Rayon 1–8 mengikuti tebakRayon() di import konten-rayon (I–VIII).
// Boleh kosong: ada polsek yang memang tidak masuk grup rayon.
function bersihkanRayon(nilai) {
  if (nilai === null || nilai === undefined || nilai === '') return null
  const angka = Number(nilai)
  if (!Number.isInteger(angka) || angka < 1 || angka > 8) {
    throw new Error('Rayon harus angka 1 sampai 8, atau dikosongkan')
  }
  return angka
}

export async function getAllUnitsList() {
  const units = await prisma.unit.findMany({
    include: {
      _count: {
        select: { links: true, rilisSubmissions: true, interaksiStatuses: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return units.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    type: u.type,
    domains: Array.isArray(u.domains) ? u.domains : [],
    aliases: Array.isArray(u.aliases) ? u.aliases : [],
    rayon: u.rayon,
    totalLinks: u._count.links,
    pemakaian: {
      links: u._count.links,
      rilis: u._count.rilisSubmissions,
      interaksi: u._count.interaksiStatuses,
      total: u._count.links + u._count.rilisSubmissions + u._count.interaksiStatuses,
    },
  }))
}

export async function getUnitById(id) {
  const unit = await prisma.unit.findUnique({ where: { id: BigInt(id) } })
  if (!unit) return null

  return {
    id: unit.id.toString(),
    name: unit.name,
    type: unit.type,
    domains: Array.isArray(unit.domains) ? unit.domains : [],
    aliases: Array.isArray(unit.aliases) ? unit.aliases : [],
    rayon: unit.rayon,
  }
}

const BULAN_PENDEK = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

// Kunci bucket bulanan versi WIB, mengikuti konvensi menu laporan.
function kunciBulan(date) {
  const { y, m } = komponenWib(date)
  return `${y}-${String(m).padStart(2, '0')}`
}

// n bulan terakhir termasuk bulan berjalan, urut dari lama ke baru.
function daftarBulan(n) {
  const kini = komponenWib(new Date())
  const hasil = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(kini.y, kini.m - 1 - i, 1))
    hasil.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: BULAN_PENDEK[d.getUTCMonth()],
    })
  }
  return hasil
}

// 00:00 WIB = 17:00 UTC hari sebelumnya; jam negatif dibiarkan mundur sendiri.
function awalBulanUtc(y, m) {
  return new Date(Date.UTC(y, m - 1, 1, -7, 0, 0))
}

export async function getUnitDetail(id, { bulan = 6 } = {}) {
  const unitId = BigInt(id)
  const unit = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!unit) return null

  const bulanList = daftarBulan(bulan)
  const [yAwal, mAwal] = bulanList[0].key.split('-').map(Number)
  const mulai = awalBulanUtc(yAwal, mAwal)

  // Sesi disaring persis seperti filterPeriodeSesi di menu laporan:
  // contentDate kalau terisi, jatuh ke createdAt kalau kosong.
  const sesi = await prisma.rekapSession.findMany({
    where: {
      formatId: { in: [FORMAT_MEDIA_SOSIAL, FORMAT_MEDIA_ONLINE] },
      OR: [
        { contentDate: { gte: mulai } },
        { contentDate: null, createdAt: { gte: mulai } },
      ],
    },
    select: { id: true, formatId: true, contentDate: true, createdAt: true },
  })

  const petaSesi = new Map(
    sesi.map((s) => [
      s.id,
      { formatId: s.formatId, bulan: kunciBulan(s.contentDate ?? s.createdAt) },
    ])
  )

  const [grouped, rilisWindow, rilisTerakhir, interaksi] = await Promise.all([
    sesi.length
      ? prisma.link.groupBy({
          by: ['sessionId'],
          where: { unitId, sessionId: { in: [...petaSesi.keys()] } },
          _count: { _all: true },
        })
      : [],
    prisma.rilisSubmission.findMany({
      where: { unitId, contentDate: { gte: mulai } },
      select: { contentDate: true },
    }),
    // Tidak dibatasi rentang, supaya "terakhir kirim" tetap jujur walau
    // kiriman terakhirnya lebih lama dari jendela grafik.
    prisma.rilisSubmission.findFirst({
      where: { unitId },
      select: { contentDate: true },
      orderBy: { contentDate: 'desc' },
    }),
    unit.type === 'POLSEK'
      ? prisma.anggotaInteraksiStatus.findFirst({
          where: { unitId, periode: bulanList[bulanList.length - 1].key },
          select: { status: true },
        })
      : null,
  ])

  const kosong = () => Object.fromEntries(bulanList.map((b) => [b.key, 0]))
  const medsos = kosong()
  const medol = kosong()
  const rilis = kosong()

  for (const g of grouped) {
    const info = petaSesi.get(g.sessionId)
    if (!info || !(info.bulan in medsos)) continue
    const target = info.formatId === FORMAT_MEDIA_SOSIAL ? medsos : medol
    target[info.bulan] += g._count._all
  }

  for (const r of rilisWindow) {
    const k = kunciBulan(r.contentDate)
    if (k in rilis) rilis[k] += 1
  }

  const bulanIni = bulanList[bulanList.length - 1].key
  const bulanLalu = bulanList.length > 1 ? bulanList[bulanList.length - 2].key : null

  const linkBulanIni = medsos[bulanIni] + medol[bulanIni]
  const linkBulanLalu = bulanLalu ? medsos[bulanLalu] + medol[bulanLalu] : 0

  let peringkat = null
  if (unit.type === 'POLSEK') {
    // Sengaja memakai fungsi ranking yang sama dengan dashboard supaya
    // posisinya tidak berbeda dari kartu di sana.
    const ranking = await getUnitRankingSocial()
    const idx = ranking.findIndex((r) => r.namaUnit === unit.name)
    if (idx >= 0) peringkat = { posisi: idx + 1, total: ranking.length }
  }

  const seri = {
    labels: bulanList.map((b) => b.label),
    medsos: bulanList.map((b) => medsos[b.key]),
    medol: bulanList.map((b) => medol[b.key]),
    rilis: bulanList.map((b) => rilis[b.key]),
  }

  return {
    id: unit.id.toString(),
    name: unit.name,
    type: unit.type,
    rayon: unit.rayon,
    domains: Array.isArray(unit.domains) ? unit.domains : [],
    aliases: Array.isArray(unit.aliases) ? unit.aliases : [],
    ringkas: {
      linkBulanIni,
      perubahan:
        linkBulanLalu > 0
          ? Math.round(((linkBulanIni - linkBulanLalu) / linkBulanLalu) * 100)
          : null,
      rilisBulanIni: rilis[bulanIni],
      rilisTerakhir: rilisTerakhir?.contentDate?.toISOString() || null,
      peringkat,
      // Polsek tanpa baris di DB dianggap BELUM, sama seperti getStatusInteraksi.
      interaksi: unit.type === 'POLSEK' ? interaksi?.status || 'BELUM' : null,
    },
    tren: {
      ...seri,
      adaData: [...seri.medsos, ...seri.medol, ...seri.rilis].some((v) => v > 0),
    },
  }
}

export async function createUnit({ name, type, domains,aliases, rayon }) {
  if (!name) throw new Error('Nama unit harus diisi')
  if (!type) throw new Error('Type unit harus diisi')

  const data = {
    name,
    type,
    domains: bersihkanDaftar(domains, { kecilkan: true }),
    aliases: bersihkanDaftar(aliases, { kecilkan: true }),
    rayon: bersihkanRayon(rayon),
  }
  try {
    const unit = await prisma.unit.create({ data })
    return { id: unit.id.toString(), name: unit.name }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Nama unit ini sudah dipakai')
    throw error
  }
}

export async function updateUnit(id, { name, type, domains, aliases, rayon }) {
  const data = {
    name: name || undefined,
    type: type || undefined,
    rayon: bersihkanRayon(rayon),
  }

  // Daftar kosong itu nilai yang sah (admin menghapus semua tag), jadi hanya
  // dilewati kalau field-nya memang tidak dikirim sama sekali.
  if (domains !== undefined) data.domains = bersihkanDaftar(domains, { kecilkan: true })
  if (aliases !== undefined) data.aliases = bersihkanDaftar(aliases)

  try {
    const unit = await prisma.unit.update({
      where: { id: BigInt(id) },
      data
    })
    return { id: unit.id.toString(), name: unit.name }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Nama unit ini sudah dipakai')
    throw error
  }
}

export async function deleteUnit(id) {
  try {
    await prisma.unit.delete({ where: { id: BigInt(id) } })
  } catch (error) {
    // Tidak ada relasi Unit yang pakai onDelete: Cascade, jadi database
    // menolak selama masih ada baris yang menunjuk ke unit ini.
    if (error.code === 'P2003') {
      throw new Error('Unit ini masih dipakai di data lain, jadi tidak bisa dihapus')
    }
    if (error.code === 'P2025') {
      throw new Error('Unit tidak ditemukan')
    }
    throw error
  }
}