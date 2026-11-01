import { cekAuth, ok, okDaftar, gagal, bacaJson } from '@/lib/api-route'
import { getAllUnitsList, createUnit } from '@/lib/models/unit'

// Unit = master data: diambil semua, filter di memori (sama dengan halaman admin).
export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    const type = searchParams.get('type')

    const units = (await getAllUnitsList()).filter(
      (u) => (!search || u.name.toLowerCase().includes(search)) && (!type || u.type === type)
    )
    return okDaftar(units, 'Data unit berhasil diambil', { total: units.length })
  } catch (error) {
    return gagal(error, 'GET Unit')
  }
}

export async function POST(req) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { name, type, domains, aliases, rayon } = await bacaJson(req)
    const unit = await createUnit({ name, type, domains, aliases, rayon })
    return ok(unit, 'Unit berhasil dibuat', 201)
  } catch (error) {
    return gagal(error, 'POST Unit')
  }
}