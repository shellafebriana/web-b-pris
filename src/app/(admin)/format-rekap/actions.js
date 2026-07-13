'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createReportFormat, updateReportFormat, deleteReportFormat } from '@/lib/models/reportFormat'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return user
}

function parseFormData(formData) {
  const configRaw = formData.get('config')
  return {
    name: formData.get('name'),
    description: formData.get('description'),
    template: formData.get('template'),
    config: configRaw ? JSON.parse(configRaw) : {},
    isActive: formData.get('isActive') === 'on',
  }
}

export async function createReportFormatAction(prevState, formData) {
  await requireAdmin()
  const id = formData.get('id')
  const data = parseFormData(formData)

  try {
    await createReportFormat({ id, ...data })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/format-rekap')
  return { success: true }
}

export async function updateReportFormatAction(id, prevState, formData) {
  await requireAdmin()
  const data = parseFormData(formData)

  try {
    await updateReportFormat(id, data)
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/format-rekap')
  return { success: true }
}

export async function deleteReportFormatAction(id) {
  await requireAdmin()
  await deleteReportFormat(id)
  revalidatePath('/format-rekap')
}