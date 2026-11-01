import { cekAuth, ok, gagal } from '@/lib/api-route'
import { getActiveFormatIds, getTodayStats } from '@/lib/models/dashboard'

export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const stats = await getTodayStats(await getActiveFormatIds())
    return ok(stats, 'Statistik hari ini berhasil diambil')
  } catch (error) {
    return gagal(error, 'GET Dashboard today-stats')
  }
}