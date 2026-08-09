'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/auth'
import { simpanStatusInteraksi } from '@/lib/models/interaksi'

export async function simpanStatusAction(prevState, formData) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') return { error: 'Tidak berwenang' }

  const periode = formData.get('periode')
  let items
  try {
    items = JSON.parse(formData.get('items') || '[]')
  } catch {
    return { error: 'Data tidak terbaca' }
  }

  try {
    const { tersimpan } = await simpanStatusInteraksi(periode, items)
    revalidatePath('/laporan/interaksi-anggota')
    return { success: `${tersimpan} polsek tersimpan` }
  } catch (e) {
    return { error: e.message }
  }
}