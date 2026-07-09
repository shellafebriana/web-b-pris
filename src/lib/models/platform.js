import prisma from '@/lib/prisma'

export async function getAllPlatforms({ search = '', page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit
  const where = search ? { name: { contains: search } } : {}

  const [total, platforms] = await Promise.all([
    prisma.platform.count({ where }),
    prisma.platform.findMany({
      where,
      include: { _count: { select: { links: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
  ])

  return {
    data: platforms.map(p => ({
      id: p.id.toString(), // BigInt -> string, wajib biar aman dikirim ke Client Component
      name: p.name,
      domain: p.domain,
      category: p.category,
      totalLinks: p._count.links,
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }
}

export async function getPlatformById(id) {
  const platform = await prisma.platform.findUnique({
    where: { id: BigInt(id) },
  })

  if (!platform) return null

  return {
    id: platform.id.toString(),
    name: platform.name,
    domain: platform.domain,
    category: platform.category,
  }
}

export async function createPlatform({ name, domain, category }) {
  if (!name) {
    throw new Error('Nama platform harus diisi')
  }
  if (category && !['sosmed', 'online'].includes(category)) {
    throw new Error('Kategori harus sosmed atau online')
  }

  try {
    const platform = await prisma.platform.create({
      data: {
        name,
        domain: domain || null,
        category: category || 'online',
      },
    })
    return { id: platform.id.toString(), name: platform.name }
  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Nama platform ini sudah dipakai')
    }
    throw error
  }
}

export async function updatePlatform(id, { name, domain, category }) {
  if (category && !['sosmed', 'online'].includes(category)) {
    throw new Error('Kategori harus sosmed atau online')
  }

  const platform = await prisma.platform.update({
    where: { id: BigInt(id) },
    data: {
      name: name || undefined,
      domain: domain || undefined,
      category: category || undefined,
    },
  })

  return { id: platform.id.toString(), name: platform.name }
}

export async function deletePlatform(id) {
  await prisma.platform.delete({ where: { id: BigInt(id) } })
}

export async function getAllPlatformsList() {
  const platforms = await prisma.platform.findMany({
    include: { _count: { select: { links: true } } },
    orderBy: { name: 'asc' },
  })

  return platforms.map(p => ({
    id: p.id.toString(),
    name: p.name,
    domain: p.domain,
    category: p.category,
    totalLinks: p._count.links,
  }))
}