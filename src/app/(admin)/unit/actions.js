'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createUnit, updateUnit, deleteUnit } from '@/lib/models/unit'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }
  return user
}

function ambilDaftar(formData, key) {
  const raw = formData.get(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function createUnitAction(prevState, formData) {
  await requireAdmin()
  const name = formData.get('name')
  const type = formData.get('type')
  const domains = ambilDaftar(formData, 'domains')
  const aliases = ambilDaftar(formData, 'aliases')
  const rayon = formData.get('rayon')

  try {
    await createUnit({ name, type, domains, aliases, rayon })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/unit')
  return { success: true }
}

export async function updateUnitAction(id, prevState, formData) {
  await requireAdmin()
  const name = formData.get('name')
  const type = formData.get('type')
  const domains = ambilDaftar(formData, 'domains')
  const aliases = ambilDaftar(formData, 'aliases')
  const rayon = formData.get('rayon')

  try {
    await updateUnit(id, { name, type, domains, aliases, rayon })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/unit')
  return { success: true }
}

export async function deleteUnitAction(id) {
  await requireAdmin()
  try {
    await deleteUnit(id)
  } catch (error) {
    return { error: error.message }
  }
  revalidatePath('/unit')
  return { success: true }
}

