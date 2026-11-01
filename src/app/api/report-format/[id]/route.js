import { cekAuth, ok, gagal, tidakDitemukan, bacaJson } from '@/lib/api-route'
import { getReportFormatById, updateReportFormat, deleteReportFormat } from '@/lib/models/reportFormat'

export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const format = await getReportFormatById(id)
    if (!format) return tidakDitemukan('Format tidak ditemukan')
    return ok(format, 'Data format berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET ReportFormat detail')
  }
}

// Semua field dikirim utuh (sama dengan form editor); Model memvalidasi
// dan membersihkan config sesuai jenisnya.
export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const { name, description, template, config, isActive } = await bacaJson(req)
    const format = await updateReportFormat(id, { name, description, template, config, isActive })
    return ok(format, 'Format berhasil diperbarui')
  } catch (error) {
    return gagal(error, 'PUT ReportFormat')
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { id } = await params
    await deleteReportFormat(id)
    return ok(null, 'Format berhasil dihapus')
  } catch (error) {
    return gagal(error, 'DELETE ReportFormat')
  }
}