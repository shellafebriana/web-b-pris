import prisma from '@/lib/prisma'

export async function getAllOperatorsList() {
  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return operators.map((o) => ({
    id: o.id.toString(),
    waId: o.waId,
  }))
}