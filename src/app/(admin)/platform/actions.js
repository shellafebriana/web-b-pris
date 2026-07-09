'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createPlatform, updatePlatform, deletePlatform } from '@/lib/models/platform'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }
  return user
}

export async function createPlatformAction(prevState, formData) {
  await requireAdmin()

  const name = formData.get('nama')
  const category = formData.get('category')
  const domainRaw = formData.get('domain')
  const domain = domainRaw ? JSON.parse(domainRaw) : []

  try {
    await createPlatform({ name, category, domain })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/platform')
  return { success: true }
}

export async function updatePlatformAction(id, prevState, formData) {
  await requireAdmin()

  const name = formData.get('nama')
  const category = formData.get('category')
  const domainRaw = formData.get('domain')
  const domain = domainRaw ? JSON.parse(domainRaw) : []

  try {
    await updatePlatform(id, { name, category, domain })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/platform')
  return { success: true }
}

export async function deletePlatformAction(id) {
  await requireAdmin()
  await deletePlatform(id)
  revalidatePath('/platform')
}