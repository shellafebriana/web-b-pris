import prisma from '@/lib/prisma'

export async function getAppConfigValue(key) {
  const config = await prisma.appConfig.findUnique({ where: { key } })
  return config?.value ?? null
}