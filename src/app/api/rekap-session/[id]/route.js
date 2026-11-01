import { cekAuth, ok, gagal, tidakDitemukan, bacaJson } from '@/lib/api-route'
import { getRekapSessionById, updateRekapSessionInfo, deleteRekapSession } from '@/lib/models/rekapSession'

const TIDAK_ADA = 'Sesi tidak ditemukan'

// Detail sesi TANPA daftar link (bisa ribuan); sama dengan halaman detail.
export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const session = await getRekapSessionById(id)
    if (!session) return tidakDitemukan(TIDAK_ADA)
    return ok(session, 'Data sesi berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET RekapSession detail')
  }
}

// Hanya judul dan rentang tanggal. State dan hasil laporan diubah lewat
// alur generate di halaman sesi, bukan ditulis langsung.
export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const { title, dateRange } = await bacaJson(req)
    const session = await updateRekapSessionInfo(id, { title, dateRange })
    return ok(session, 'Sesi berhasil diperbarui')
  } catch (error) {
    return gagal(error, 'PUT RekapSession')
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    await deleteRekapSession(id)
    return ok(null, 'Sesi berhasil dihapus')
  } catch (error) {
    return gagal(error, 'DELETE RekapSession')
  }
}