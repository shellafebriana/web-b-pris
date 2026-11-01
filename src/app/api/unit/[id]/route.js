import { cekAuth, ok, gagal, tidakDitemukan, idAngka, bacaJson } from '@/lib/api-route'
import { getUnitById, updateUnit, deleteUnit } from '@/lib/models/unit'

const TIDAK_ADA = 'Unit tidak ditemukan'

export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    const unit = id && await getUnitById(id)
    if (!unit) return tidakDitemukan(TIDAK_ADA)
    return ok(unit, 'Data unit berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Unit detail')
  }
}

export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    const { name, type, domains, aliases, rayon } = await bacaJson(req)
    const unit = await updateUnit(id, { name, type, domains, aliases, rayon })
    return ok(unit, 'Unit berhasil diperbarui')
  } catch (error) {
    return gagal(error, 'PUT Unit')
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    await deleteUnit(id)
    return ok(null, 'Unit berhasil dihapus')
  } catch (error) {
    return gagal(error, 'DELETE Unit')
  }
}