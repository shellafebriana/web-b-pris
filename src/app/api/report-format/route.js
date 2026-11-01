import { cekAuth, ok, okDaftar, gagal, bacaJson } from '@/lib/api-route'
import { getAllReportFormatsList, createReportFormat } from '@/lib/models/reportFormat'

// Format = master data: diambil semua, filter di memori.
// ?jenis=rekap|monitoring, ?isActive=true|false, ?search=
export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    const isActive = searchParams.get('isActive')
    const jenis = searchParams.get('jenis') || undefined

    const formats = (await getAllReportFormatsList({ jenis })).filter(
      (f) =>
        (!search || f.name.toLowerCase().includes(search) || f.id.includes(search)) &&
        (isActive === null || f.isActive === (isActive === 'true'))
    )
    return okDaftar(formats, 'Data format berhasil diambil', { total: formats.length })
  } catch (error) {
    return gagal(error, 'GET ReportFormat')
  }
}

// ID tidak diterima dari body; ditetapkan otomatis oleh Model.
export async function POST(req) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { name, description, template, config, isActive } = await bacaJson(req)
    const format = await createReportFormat({ name, description, template, config, isActive })
    return ok(format, 'Format berhasil dibuat', 201)
  } catch (error) {
    return gagal(error, 'POST ReportFormat')
  }
}