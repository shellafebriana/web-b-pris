import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import ImportTxtForm from '@/components/laporan/ImportTxtForm'
import { ChevronLeftIcon } from '@/icons'

export const metadata = { title: 'Impor Susulan Media Online' }

export default async function ImportMediaOnlinePage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Link href="/laporan/media-online" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-3 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ChevronLeftIcon className="size-4" /> Kembali
        </Link>
      </div>
      <div className="mb-4">
        <h1 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white">
          Impor Susulan Media Online
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload file export chat WhatsApp buat menambal data yang belum masuk. Link yang sudah
          ada di database otomatis dilewati.
        </p>
      </div>
      <ImportTxtForm />
    </div>
  )
}