import { cekAuth, ok, gagal, tidakDitemukan, idAngka, bacaJson } from '@/lib/api-route'
import { getPlatformById, updatePlatform, deletePlatform } from '@/lib/models/platform'

const TIDAK_ADA = 'Platform tidak ditemukan'

export async function GET(req, { params }) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    const platform = id && await getPlatformById(id)
    if (!platform) return tidakDitemukan(TIDAK_ADA)
    return ok(platform, 'Data platform berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Platform detail')
  }
}

export async function PUT(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    const { name, domain, category } = await bacaJson(req)
    const platform = await updatePlatform(id, { name, domain, category })
    return ok(platform, 'Platform berhasil diperbarui')
  } catch (error) {
    return gagal(error, 'PUT Platform')
  }
}

export async function DELETE(req, { params }) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const id = idAngka((await params).id)
    if (!id) return tidakDitemukan(TIDAK_ADA)
    await deletePlatform(id)
    return ok(null, 'Platform berhasil dihapus')
  } catch (error) {
    return gagal(error, 'DELETE Platform')
  }
}