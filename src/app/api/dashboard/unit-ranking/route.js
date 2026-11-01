import { cekAuth, ok, gagal } from '@/lib/api-route'
import { getUnitRankingSocial, getUnitRankingOnline } from '@/lib/models/dashboard'

// ?jenis=online untuk peringkat media online; default media sosial.
export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const jenis = new URL(req.url).searchParams.get('jenis')
    const ranking = jenis === 'online' ? await getUnitRankingOnline() : await getUnitRankingSocial()
    return ok(ranking, 'Peringkat unit berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Dashboard unit-ranking')
  }
}