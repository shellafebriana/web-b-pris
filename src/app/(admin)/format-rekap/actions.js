'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createReportFormat, updateReportFormat, deleteReportFormat } from '@/lib/models/reportFormat'
import { parse } from 'mustache'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return user
}

function parseFormData(formData) {
  let config
  try {
    config = JSON.parse(formData.get('config') || '{}')
  } catch {
    throw new Error('Konfigurasi format tidak dapat dibaca. Muat ulang halaman, lalu coba lagi.')
  }
  return {
    name: formData.get('name'),
    description: formData.get('description'),
    template: formData.get('template'),
    config,
    isActive: formData.get('isActive') === 'on',
  }
}
function revalidateFormat() {
  revalidatePath('/format-rekap')
  revalidatePath('/sesi-rekap')
}


export async function createReportFormatAction(prevState, formData) {
  await requireAdmin()
  let hasil

  try {
    hasil = await createReportFormat(parseFormData(formData))
  } catch (error) {
    return { error: error.message, success: false }
  }

  revalidateFormat()
  return { success: true, id: hasil.id }
}

export async function updateReportFormatAction(id, prevState, formData) {
  await requireAdmin()

  try {
    await updateReportFormat(id, parseFormData(formData))
  } catch (error) {
    return { error: error.message, success: false }
  }

  revalidateFormat()
  revalidatePath(`/format-rekap/${id}/edit`)
  return { success: true, id }
}

export async function deleteReportFormatAction(id) {
  await requireAdmin()
  try {
    await deleteReportFormat(id)
  } catch (error) {
    return { error: error.message, success: false }
  }

  revalidateFormat()
  return { success: true }
}