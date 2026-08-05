import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import ImportTxtForm from '@/components/laporan/ImportTxtForm'

export const metadata = { title: 'Impor Susulan Media Online' }

export default async function ImportMediaOnlinePage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <Link href="/laporan/media-online" className="text-sm text-brand-500 hover:underline">
          ← Kembali ke Laporan Media Online
        </Link>
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