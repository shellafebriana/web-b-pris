import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getKandidat } from '@/lib/models/monitoring'
import KandidatPanel from '@/components/monitoring/KandidatPanel'
import { ChevronLeftIcon } from '@/icons'

const KANAL_SAH = ['ONLINE', 'SOSMED']

export default async function KandidatPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const sp = await searchParams

  // Whitelist searchParams — jangan percaya nilai dari URL.
  const halaman = Math.min(Math.max(Number(sp?.page) || 1, 1), 999)
  const kanal = KANAL_SAH.includes(sp?.kanal) ? sp.kanal : null

  const { data, kategori, pagination } = await getKandidat({ page: halaman, kanal })

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/monitoring`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeftIcon className="size-4" /> Kembali ke daftar
        </Link>
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
          Antrean Kandidat
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Berita yang ditarik otomatis. Centang yang layak masuk laporan hari ini.
        </p>
      </div>

      <KandidatPanel
        data={data}
        kategori={kategori}
        pagination={pagination}
        kanalAktif={kanal}
      />
    </div>
  )
}