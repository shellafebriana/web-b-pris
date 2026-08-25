import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getSesiDetail } from '@/lib/models/monitoring'
import SesiDetailPanel from '@/components/monitoring/SesiDetailPanel'
import { ChevronLeftIcon } from '@/icons'

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function labelTanggal(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`
}

export default async function SesiMonitoringPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params
  const sesi = await getSesiDetail(id)
  if (!sesi) notFound()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
           <Link
              href={`/monitoring?bulan=${sesi.tanggal.slice(0, 7)}`}
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeftIcon className="size-4" /> Kembali ke daftar
            </Link>
          <h1 className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white">
            {labelTanggal(sesi.tanggal)}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {sesi.totalOnline} media online · {sesi.totalSosmed} media sosial
          </p>
        </div>
      </div>

      <SesiDetailPanel sesi={sesi} />
    </div>
  )
}