import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllRekapSessions } from '@/lib/models/rekapSession'
import ViralisasiSpripimList from '@/components/laporan/ViralisasiSpripimList'

const FORMAT_ID = 'format4' // Manajemen Media Sosial (Kapolresta)

export default async function ViralisasiSpripimPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''

  const { data: sessions, pagination } = await getAllRekapSessions({
    search,
    formatId: FORMAT_ID,
    page,
    limit: 10,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Laporan Viralisasi Spripim</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate PPTX dari Sesi Rekap format "Manajemen Media Sosial (Kapolresta)" — {pagination.total} sesi tersedia
        </p>
      </div>

      <ViralisasiSpripimList sessions={sessions} pagination={pagination} />
    </div>
  )
}