import Link from 'next/link'
import { MODE_LIST } from '@/lib/laporan/periode'

/**
 * Server Component. <form method="GET"> + <Link> biasa, TANPA state client —
 * tetap fungsional walau bundle JS belum turun.
 */
export default function PeriodeBar({ periode }) {
  const { mode, periode: nilai } = periode
  const tahunIni = new Date().getFullYear()

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-4 flex w-fit items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {MODE_LIST.map((m) => (
          <Link
            key={m}
            href={`?mode=${m}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              m === mode
                ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {m}
          </Link>
        ))}
      </div>

      <form method="GET" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <input type="hidden" name="mode" value={mode} />

        <div className="w-full sm:max-w-56">
          <label
            htmlFor="periode"
            className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            {mode === 'harian' ? 'Tanggal' : mode === 'tahunan' ? 'Tahun' : 'Bulan'}
          </label>
          <input
            id="periode"
            name="periode"
            defaultValue={nilai}
            type={mode === 'harian' ? 'date' : mode === 'bulanan' ? 'month' : 'number'}
            min={mode === 'tahunan' ? 2020 : undefined}
            max={mode === 'tahunan' ? tahunIni + 1 : undefined}
            className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Terapkan
        </button>
      </form>
    </div>
  )
}