import prisma from '@/lib/prisma'

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