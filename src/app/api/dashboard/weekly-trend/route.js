import { cekAuth, ok, gagal } from '@/lib/api-route'
import { getAktivitasBulanIni } from '@/lib/models/dashboard'

export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { weeklyTrend } = await getAktivitasBulanIni()
    return ok(weeklyTrend, 'Tren mingguan berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Dashboard weekly-trend')
  }
}