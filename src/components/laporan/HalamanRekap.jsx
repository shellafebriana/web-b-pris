import { Suspense } from 'react'
import { parsePeriode } from '@/lib/laporan/periode'
import { JENIS_LAPORAN } from '@/lib/laporan/registry'
import { getFormatLaporan, getKelengkapanHarian } from '@/lib/models/laporan'
import PeriodeBar from './PeriodeBar'
import ExportButtons from './ExportButtons'
import TabelRekap from './TabelRekap'
import PanelKelengkapan from './PanelKelengkapan'

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

async function IsiLaporan({ cfg, periode }) {
  const [data, kelengkapan] = await Promise.all([
    cfg.ambil({ formatIds: cfg.formatId ? [cfg.formatId] : [], periode }),
    cfg.punyaKelengkapan
      ? getKelengkapanHarian({ formatIds: [cfg.formatId], periode })
      : Promise.resolve(null),
  ])

  return (
    <div className="space-y-5">
      <PanelKelengkapan data={kelengkapan} labelPeriode={periode.label} />
      <TabelRekap
        data={data}
        judulCetak={cfg.judulCetak}
        labelJudul={periode.labelJudul}
        kolomEntitas={cfg.kolomEntitas}
      />
    </div>
  )
}

export default async function HalamanRekap({ jenis, searchParams }) {
  const cfg = JENIS_LAPORAN[jenis]
  const params = await searchParams
  const periode = parsePeriode(params)
  const format = cfg.formatId ? await getFormatLaporan(cfg.formatId) : null
  const siap = cfg.formatId ? Boolean(format?.isActive) : true

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">{cfg.judul}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Rekap per polsek — {periode.label}
          {format?.name ? ` · ${format.name}` : ''}
        </p>
      </div>

      <div className="space-y-5">
        <PeriodeBar periode={periode} />
        <ExportButtons jenis={jenis} periode={periode} disabled={!siap} />

        {!siap ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/30 dark:bg-error-500/10">
            <p className="font-medium text-error-700 dark:text-error-400">Format sumber tidak tersedia</p>
            <p className="mt-1 text-sm text-error-600 dark:text-error-400/80">
              Laporan ini mengambil data dari format <code>{cfg.formatId}</code>, tapi format itu{' '}
              {!format ? 'tidak ditemukan' : 'sedang non-aktif'}. Cek di menu Format Rekap.
            </p>
          </div>
        ) : (
          <Suspense key={`${jenis}-${periode.mode}-${periode.periode}`} fallback={<SkeletonTabel />}>
            <IsiLaporan cfg={cfg} periode={periode} />
          </Suspense>
        )}
      </div>
    </div>
  )
}