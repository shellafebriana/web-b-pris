import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import HalamanRekap from '@/components/laporan/HalamanRekap'

export const metadata = { title: 'Laporan Media Online' }

export default async function MediaOnlinePage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/laporan/media-online/import"
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Impor Susulan (.txt)
        </Link>
      </div>
      <HalamanRekap jenis="media-online" searchParams={searchParams} />
    </>
  )
}