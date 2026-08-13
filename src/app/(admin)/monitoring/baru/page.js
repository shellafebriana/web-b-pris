import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { buatSesiMonitoring } from '@/lib/models/monitoring'

export default async function BuatSesiPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const tanggal = params?.tanggal

  if (typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    redirect('/monitoring')
  }

  let id
  try {
    id = await buatSesiMonitoring(tanggal)
  } catch {
    redirect('/monitoring')
  }

  // redirect() melempar internal, jadi WAJIB di luar try/catch.
  redirect(`/monitoring/${id}`)
}