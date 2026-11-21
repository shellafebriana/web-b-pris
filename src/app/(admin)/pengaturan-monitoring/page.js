import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

// Menu Pengaturan Monitoring berupa dropdown; halaman induknya hanya
// mengarahkan ke sub-menu pertama supaya tidak muncul 404.
export default async function PengaturanMonitoringPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  redirect('/pengaturan-monitoring/prompt')
}