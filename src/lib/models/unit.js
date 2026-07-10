import prisma from '@/lib/prisma'

export async function getAllUnitsList() {
  const units = await prisma.unit.findMany({
    include: { _count: { select: { links: true } } },
    orderBy: { name: 'asc' },
  })

  return units.map(u => ({
    id: u.id.toString(),
    name: u.name,
    type: u.type,
    totalLinks: u._count.links,
  }))
}

export async function createUnit({ name, type }) {
  if (!name) throw new Error('Nama unit harus diisi')
  if (!type) throw new Error('Type unit harus diisi')

  try {
    const unit = await prisma.unit.create({ data: { name, type } })
    return { id: unit.id.toString(), name: unit.name }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Nama unit ini sudah dipakai')
    throw error
  }
}

export async function updateUnit(id, { name, type }) {
  try {
    const unit = await prisma.unit.update({
      where: { id: BigInt(id) },
      data: { name: name || undefined, type: type || undefined },
    })
    return { id: unit.id.toString(), name: unit.name }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Nama unit ini sudah dipakai')
    throw error
  }
}

export async function deleteUnit(id) {
  await prisma.unit.delete({ where: { id: BigInt(id) } })
}