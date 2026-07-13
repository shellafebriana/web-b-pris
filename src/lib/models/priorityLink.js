import prisma from '@/lib/prisma'

export async function getAllPriorityLinksList() {
  const links = await prisma.priorityLink.findMany({
    orderBy: { priority: 'asc' },
  })

  return links.map((l) => ({
    id: l.id.toString(),
    keyword: l.keyword,
    description: l.description,
    priority: l.priority,
    isActive: l.isActive,
  }))
}

export async function createPriorityLink({ keyword, description, isActive }) {
  if (!keyword) throw new Error('Keyword harus diisi')

  try {
    const link = await prisma.priorityLink.create({
      data: {
        keyword,
        description: description || null,
        isActive: isActive !== false,
      },
    })
    return { id: link.id.toString() }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Keyword ini sudah ada')
    throw error
  }
}

export async function updatePriorityLink(id, { keyword, description, priority, isActive }) {
  try {
    const link = await prisma.priorityLink.update({
      where: { id: BigInt(id) },
      data: {
        keyword: keyword || undefined,
        description: description !== undefined ? (description || null) : undefined,
        isActive,
      },
    })
    return { id: link.id.toString() }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('Keyword ini sudah ada')
    throw error
  }
}

export async function deletePriorityLink(id) {
  await prisma.priorityLink.delete({ where: { id: BigInt(id) } })
}

export async function reorderPriorityLinks(orderedIds) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.priorityLink.update({
        where: { id: BigInt(id) },
        data: { priority: index + 1 },
      })
    )
  )
}