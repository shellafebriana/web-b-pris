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
  ambilKandidat,
  tolakKandidat,
  tandaiSudahReview,
  perbaruiKlaster
} from '@/lib/models/monitoring'
import { getDayRange } from '@/lib/date-helpers'
import { pisahJudulUrl } from '@/lib/monitoring/klasifikasi'

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
  const tempelan = formData.get('tempelan')
  const kategoriId = formData.get('kategoriId') || null

  try {
    const baris = pisahJudulUrl(String(tempelan ?? ''))
    if (baris.length === 0) return { error: 'Belum ada yang ditempel' }

    const daftar = baris
      .filter((b) => b.url)
      .map((b) => ({ judul: b.judul || b.url, url: b.url, kategoriId }))

    const tanpaUrl = baris.length - daftar.length
    if (daftar.length === 0) return { error: 'Tidak ada link yang terbaca' }

    const hasil = await tambahItemMonitoring(sesiId, daftar)
    await perbaruiKlaster()
    revalidatePath(`/monitoring/${sesiId}`)
    revalidatePath('/dashboard')

    const pesan = [`${hasil.masuk} item masuk`]
    if (hasil.duplikat) pesan.push(`${hasil.duplikat} sudah ada`)
    if (tanpaUrl) pesan.push(`${tanpaUrl} baris tanpa link dilewati`)
    return { sukses: pesan.join(', ') }
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
    revalidatePath('/monitoring/review')
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

export async function ambilKandidatAction(daftarId, petaKategori = {}) {
  await requireAdmin()
  try {
    if (!Array.isArray(daftarId) || daftarId.length === 0) {
      return { error: 'Belum ada kandidat yang dipilih' }
    }
    // Tanggal sesi ditentukan SERVER, bukan dikirim klien.
    const { startOfDay } = getDayRange()
    const tanggal = new Date(startOfDay.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const sesiId = await buatSesiMonitoring(tanggal)
    const hasil = await ambilKandidat(sesiId, daftarId, petaKategori)
    await perbaruiKlaster()
    revalidatePath('/monitoring/kandidat')
    revalidatePath(`/monitoring/${sesiId}`)
    revalidatePath('/monitoring')
    revalidatePath('/dashboard')
    return { ...hasil, sesiId }
  } catch (error) {
    return { error: error.message }
  }
}

export async function tolakKandidatAction(daftarId) {
  await requireAdmin()
  try {
    if (!Array.isArray(daftarId) || daftarId.length === 0) {
      return { error: 'Belum ada kandidat yang dipilih' }
    }
    await tolakKandidat(daftarId)
    revalidatePath('/monitoring/kandidat')
    return { sukses: true }
  } catch (error) {
    return { error: error.message }
  }
}

export async function tandaiReviewAction(daftarId) {
  await requireAdmin()
  try {
    if (!Array.isArray(daftarId) || daftarId.length === 0) {
      return { error: 'Belum ada item yang dipilih' }
    }
    await tandaiSudahReview(daftarId)
    revalidatePath('/monitoring/review')
    revalidatePath('/monitoring')
    return { sukses: true }
  } catch (error) {
    return { error: error.message }
  }
}