import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import HalamanRekap from '@/components/laporan/HalamanRekap'

export const metadata = { title: 'Laporan Media Sosial' }

export default async function MediaSosialPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return <HalamanRekap jenis="media-sosial" searchParams={searchParams} />
}