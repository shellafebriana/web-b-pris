import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { parsePeriode } from '@/lib/laporan/periode'
import { getRekapMediaSosial, getFormatMedsos, FORMAT_MEDSOS } from '@/lib/models/laporan'
import PeriodeBar from '@/components/laporan/PeriodeBar'
import TabelRekapMedsos from '@/components/laporan/TabelRekapMedsos'
import ExportButtons from '@/components/laporan/ExportButtons'

export const metadata = { title: 'Laporan Media Sosial' }

function SkeletonTabel() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mx-auto mb-6 h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  )
}

async function IsiLaporan({ start, end, labelJudul }) {
  const data = await getRekapMediaSosial({ formatIds: [FORMAT_MEDSOS], start, end })
  return <TabelRekapMedsos data={data} labelJudul={labelJudul} />
}

export default async function MediaSosialPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const periode = parsePeriode(params)
  const format = await getFormatMedsos()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
          Laporan Media Sosial
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Rekap link amplifikasi per polsek — {periode.label}
          {format?.isActive ? ` · ${format.name}` : ''}
        </p>
      </div>

      <div className="space-y-5">
        <PeriodeBar periode={periode} />
        <ExportButtons periode={periode} disabled={!format?.isActive} />
        {!format || !format.isActive ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/30 dark:bg-error-500/10">
            <p className="font-medium text-error-700 dark:text-error-400">
              Format sumber tidak tersedia
            </p>
            <p className="mt-1 text-sm text-error-600 dark:text-error-400/80">
              Laporan ini mengambil data dari format <code>{FORMAT_MEDSOS}</code>, tapi format
              itu {!format ? 'tidak ditemukan' : 'sedang non-aktif'}. Cek di menu Format Rekap.
            </p>
          </div>
        ) : (
          <Suspense key={`${periode.mode}-${periode.periode}`} fallback={<SkeletonTabel />}>
            <IsiLaporan
              start={periode.start}
              end={periode.end}
              labelJudul={periode.labelJudul}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}