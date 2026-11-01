import { cekAuth, ok, gagal, tidakDitemukan, idAngka, bacaJson } from '@/lib/api-route'
import { getPriorityLinkById, updatePriorityLink, deletePriorityLink } from '@/lib/models/priorityLink'

const TIDAK_ADA = 'Link prioritas tidak ditemukan'

export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    const link = id && await getPriorityLinkById(id)
    if (!link) return tidakDitemukan(TIDAK_ADA)
    return ok(link, 'Data link prioritas berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET PriorityLink detail')
  }
}

// Urutan prioritas tidak diubah di sini; diatur lewat drag-and-drop di
// halaman Link Prioritas (reorderPriorityLinks).
export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    const { keyword, description, isActive } = await bacaJson(req)
    const link = await updatePriorityLink(id, { keyword, description, isActive })
    return ok(link, 'Link prioritas berhasil diperbarui')
  } catch (error) {
    return gagal(error, 'PUT PriorityLink')
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    await deletePriorityLink(id)
    return ok(null, 'Link prioritas berhasil dihapus')
  } catch (error) {
    return gagal(error, 'DELETE Priority Link')
  }
}