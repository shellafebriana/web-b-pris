import prisma from '@/lib/prisma'

export const STATUS_LIST = ['BELUM', 'SUDAH', 'TERLAMBAT']

const URUTAN = { BELUM: 0, TERLAMBAT: 1, SUDAH: 2 } // yang belum kirim di atas

/**
 * Selalu mengembalikan SEMUA polsek, termasuk yang belum punya baris di DB.
 * Polsek yang belum pernah diinput muncul sebagai BELUM — bukan hilang dari
 * daftar, supaya tidak ada yang luput dari perhatian.
 */
export async function getStatusInteraksi(periode, unitType = 'POLSEK') {
  const [units, rows] = await Promise.all([
    prisma.unit.findMany({
      where: { type: unitType },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.anggotaInteraksiStatus.findMany({
      where: { periode },
      select: { unitId: true, status: true, linkDrive: true, keterangan: true, updatedAt: true },
    }),
  ])

  const peta = new Map(rows.map((r) => [r.unitId.toString(), r]))

  const hasil = units.map((u) => {
    const id = u.id.toString()
    const r = peta.get(id)
    return {
      unitId: id,
      unitName: u.name,
      status: STATUS_LIST.includes(r?.status) ? r.status : 'BELUM',
      linkDrive: r?.linkDrive || '',
      keterangan: r?.keterangan || '',
      updatedAt: r?.updatedAt ? r.updatedAt.toISOString() : null,
    }
  })

  hasil.sort(
    (a, b) => URUTAN[a.status] - URUTAN[b.status] || a.unitName.localeCompare(b.unitName, 'id')
  )

  const ringkasan = { total: hasil.length, BELUM: 0, SUDAH: 0, TERLAMBAT: 0 }
  for (const h of hasil) ringkasan[h.status]++

  return { rows: hasil.map((h, i) => ({ ...h, no: i + 1 })), ringkasan }
}

/**
 * Simpan massal. Validasi dilakukan di sini (Model), bukan di Server Action —
 * supaya aturan yang sama berlaku dari mana pun fungsi ini dipanggil.
 */
export async function simpanStatusInteraksi(periode, items) {
  if (!/^\d{4}-\d{2}$/.test(periode)) throw new Error('Periode tidak valid')
  if (!Array.isArray(items) || items.length === 0) throw new Error('Tidak ada data')
  if (items.length > 100) throw new Error('Terlalu banyak baris')

  // Hanya unit yang benar-benar ada yang boleh disimpan.
  const units = await prisma.unit.findMany({ where: { type: 'POLSEK' }, select: { id: true } })
  const valid = new Set(units.map((u) => u.id.toString()))

  const bersih = []
  for (const it of items) {
    const unitId = String(it?.unitId || '')
    if (!valid.has(unitId)) continue

    const status = STATUS_LIST.includes(it?.status) ? it.status : 'BELUM'

    let linkDrive = typeof it?.linkDrive === 'string' ? it.linkDrive.trim() : ''
    if (linkDrive) {
      let u
      try {
        u = new URL(linkDrive)
      } catch {
        throw new Error(`Link tidak valid untuk salah satu polsek: ${linkDrive.slice(0, 40)}`)
      }
      // Batasi ke http(s): mencegah javascript: dan data: yang bisa dieksekusi
      // kalau link ini nanti dirender sebagai <a href>.
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        throw new Error('Link harus diawali http:// atau https://')
      }
      if (linkDrive.length > 2000) throw new Error('Link terlalu panjang')
    }

    bersih.push({
      unitId: BigInt(unitId),
      status,
      linkDrive: linkDrive || null,
      keterangan: typeof it?.keterangan === 'string' ? it.keterangan.trim().slice(0, 255) || null : null,
    })
  }

  if (bersih.length === 0) throw new Error('Tidak ada baris valid')

  // Sequential, bukan $transaction: 26 upsert ringan, dan transaksi panjang
  // berisiko kena connection pool timeout kalau ada request lain bersamaan.
  for (const b of bersih) {
    await prisma.anggotaInteraksiStatus.upsert({
      where: { unitId_periode: { unitId: b.unitId, periode } },
      create: { unitId: b.unitId, periode, status: b.status, linkDrive: b.linkDrive, keterangan: b.keterangan },
      update: { status: b.status, linkDrive: b.linkDrive, keterangan: b.keterangan },
    })
  }

  return { tersimpan: bersih.length }
}