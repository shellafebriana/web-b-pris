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

export async function createUnitAction(prevState, formData) {
  await requireAdmin()
  const name = formData.get('name')
  const type = formData.get('type')

  try {
    await createUnit({ name, type })
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

  try {
    await updateUnit(id, { name, type })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/unit')
  return { success: true }
}

export async function deleteUnitAction(id) {
  await requireAdmin()
  await deleteUnit(id)
  revalidatePath('/unit')
}