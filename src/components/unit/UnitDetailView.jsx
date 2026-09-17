"use client"

import { useRouter } from 'next/navigation'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChevronLeftIcon } from '@/icons'
import UnitFormModal from './UnitFormModal'

const STATUS_STYLE = {
  SUDAH: 'border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-500/10 dark:text-success-400',
  TERLAMBAT: 'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-400',
  BELUM: 'border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400',
}

function Kartu({ label, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <p className="mb-2 text-xs font-medium text-gray-400">{label}</p>
      {children}
    </div>
  )
}

function TagList({ label, hint, items }) {
  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">
        {label} <span className="text-gray-300 dark:text-gray-600">· {hint}</span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs italic text-gray-400">Belum diisi</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <span
              key={t}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UnitDetailView({ unit }) {
  const router = useRouter()
  const { ringkas, tren } = unit
  const isPolsek = unit.type === 'POLSEK'

  const dataChart = tren.labels.map((label, i) => ({
    label,
    medsos: tren.medsos[i],
    medol: tren.medol[i],
    rilis: tren.rilis[i],
  }))

  return (
    <div className="fixed inset-0 z-999999 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/unit')}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeftIcon className="size-4" /> Kembali
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{unit.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
              <span>{unit.type}</span>
              {unit.rayon ? (
                <>
                  <span>·</span>
                  <span>Rayon {unit.rayon}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <UnitFormModal mode="edit" unit={unit} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isPolsek ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
          <Kartu label="Link bulan ini">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {ringkas.linkBulanIni.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {ringkas.perubahan === null
                ? 'belum ada pembanding'
                : `${ringkas.perubahan > 0 ? '+' : ''}${ringkas.perubahan}% dari bulan lalu`}
            </p>
          </Kartu>

          {isPolsek && (
            <Kartu label="Peringkat polsek">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {ringkas.peringkat ? `#${ringkas.peringkat.posisi}` : '—'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {ringkas.peringkat ? `dari ${ringkas.peringkat.total} polsek` : 'tidak masuk peringkat'}
              </p>
            </Kartu>
          )}

          <Kartu label="Rilis bulan ini">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{ringkas.rilisBulanIni}</p>
            <p className="mt-1 text-xs text-gray-400">
              {ringkas.rilisTerakhir
                ? `terakhir ${new Date(ringkas.rilisTerakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                : 'belum pernah kirim'}
            </p>
          </Kartu>

          {isPolsek && (
            <div className={`rounded-xl border p-4 ${STATUS_STYLE[ringkas.interaksi] || STATUS_STYLE.BELUM}`}>
              <p className="mb-2 text-xs font-medium opacity-80">Interaksi anggota</p>
              <p className="text-xl font-semibold">{ringkas.interaksi}</p>
              <p className="mt-1 text-xs opacity-80">periode bulan ini</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400">Aktivitas 6 bulan terakhir</p>

          {!tren.adaData ? (
            <p className="py-10 text-center text-sm text-gray-400">Tidak ada data</p>
          ) : (
            <>
              <div className="mt-2 mb-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rounded-sm bg-brand-500" />Link medsos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rounded-sm bg-success-500" />Link medol
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rounded-sm bg-orange-500" />Rilis
                </span>
              </div>

              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dataChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    {/* Rilis dipisah ke sumbu kanan: skalanya belasan lawan ribuan,
                        kalau disatukan batangnya rata dengan garis dasar. */}
                    <YAxis yAxisId="kiri" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <YAxis yAxisId="kanan" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <Tooltip />
                    <Bar yAxisId="kiri" dataKey="medsos" name="Link medsos" fill="#465fff" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar yAxisId="kiri" dataKey="medol" name="Link medol" fill="#12b76a" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar yAxisId="kanan" dataKey="rilis" name="Rilis" fill="#fb6514" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-xs font-medium text-gray-400">Identitas teknis</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TagList label="Domain" hint="dipakai deteksi unit otomatis" items={unit.domains} />
            <TagList label="Alias" hint="dipakai pencocokan teks rilis" items={unit.aliases} />
          </div>
        </div>
      </div>
    </div>
  )
}