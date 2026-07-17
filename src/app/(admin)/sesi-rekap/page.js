import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllRekapSessions } from '@/lib/models/rekapSession'
import { getAllReportFormatsList } from '@/lib/models/reportFormat'
import RekapSessionList from '@/components/sesi-rekap/RekapSessionList'

export default async function SesiRekapPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const state = params.state || ''
  const formatId = params.format || ''

  const [{ data: sessions, pagination }, formats] = await Promise.all([
    getAllRekapSessions({ search, state, formatId, page, limit: 10 }),
    getAllReportFormatsList(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Sesi Rekap</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {pagination.total} sesi rekap tercatat
        </p>
      </div>

      <RekapSessionList sessions={sessions} pagination={pagination} formats={formats} />
    </div>
  )
}