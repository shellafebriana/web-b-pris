import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import ImportRilisForm from '@/components/laporan/ImportRilisForm'

export const metadata = { title: 'Impor Rilis Rayon' }

export default async function ImportRilisPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <Link href="/laporan/konten-rayon" className="text-sm text-brand-500 hover:underline">
          ← Kembali ke Laporan Konten Rayon
        </Link>
        <h1 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white">
          Impor Rilis Rayon
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Satu rilis dihitung dari satu pesan berheader POLSEK. Foto lampiran tidak dihitung
          terpisah. Rilis yang sudah ada otomatis dilewati.
        </p>
      </div>
      <ImportRilisForm />
    </div>
  )
}