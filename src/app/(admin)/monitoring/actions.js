'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import {
  buatSesiMonitoring,
  tambahItemMonitoring,
  ubahKategoriItem,
  hapusItemMonitoring,
  ubahStateSesi,
  generateLaporanMonitoring,
} from '@/lib/models/monitoring'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return user
}

export async function buatSesiAction(tanggal) {
  await requireAdmin()
  try {
    const id = await buatSesiMonitoring(tanggal)
    revalidatePath('/monitoring')
    return { id }
  } catch (error) {
    return { error: error.message }
  }
}

export async function tambahItemAction(sesiId, prevState, formData) {
  await requireAdmin()
  const judul = formData.get('judul')
  const url = formData.get('url')
  const kategoriId = formData.get('kategoriId') || null

  try {
    const hasil = await tambahItemMonitoring(sesiId, [{ judul, url, kategoriId }])
    revalidatePath(`/monitoring/${sesiId}`)
    if (hasil.duplikat > 0) return { error: 'Link ini sudah ada di sesi hari itu' }
    if (hasil.gagal.length > 0) return { error: hasil.gagal[0].alasan }
    return { sukses: 'Item ditambahkan' }
  } catch (error) {
    return { error: error.message }
  }
}

// Dipanggil langsung dari Client Component, bukan lewat <form>.
export async function ubahKategoriAction(itemId, kategoriId, sesiId) {
  await requireAdmin()
  try {
    await ubahKategoriItem(itemId, kategoriId)
    revalidatePath(`/monitoring/${sesiId}`)
    return { sukses: true }
  } catch (error) {
    return { error: error.message }
  }
}

export async function hapusItemAction(itemId, sesiId) {
  await requireAdmin()
  try {
    await hapusItemMonitoring(itemId)
    revalidatePath(`/monitoring/${sesiId}`)
    return { sukses: true }
  } catch (error) {
    return { error: error.message }
  }
}

export async function ubahStateAction(sesiId, state) {
  await requireAdmin()
  try {
    await ubahStateSesi(sesiId, state)
    revalidatePath(`/monitoring/${sesiId}`)
    revalidatePath('/monitoring')
    return { sukses: true }
  } catch (error) {
    return { error: error.message }
  }
}

export async function generateLaporanAction(sesiId, formatId) {
  await requireAdmin()
  try {
    return await generateLaporanMonitoring(sesiId, formatId)
  } catch (error) {
    return { error: error.message }
  }
}