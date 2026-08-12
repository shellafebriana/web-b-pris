import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getSesiViralisasi } from '@/lib/models/laporan'
import ViralisasiSpripimList from '@/components/laporan/ViralisasiSpripimList'

export default async function ViralisasiSpripimPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const halaman = Number.parseInt(params?.page, 10)
  const tanggal = typeof params?.tanggal === 'string' ? params.tanggal : ''

  const { data, pagination, periode } = await getSesiViralisasi({
    tanggal,
    page: Number.isFinite(halaman) && halaman > 0 ? halaman : 1,
    limit: 10,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Laporan Viralisasi Spripim</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pilih sesi Manajemen Media Sosial Kapolda, lalu salin link per platform ke PowerPoint —
          {' '}{pagination.total} sesi{periode ? ` pada ${periode.label}` : ''}
        </p>
      </div>

      <ViralisasiSpripimList sessions={data} pagination={pagination} />
    </div>
  )
}