import { cekAuth, ok, gagal } from '@/lib/api-route'
import { getPlatformRankingSosmed } from '@/lib/models/dashboard'

export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const ranking = await getPlatformRankingSosmed()
    return ok(ranking, 'Peringkat platform berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Dashboard platform-ranking')
  }
}