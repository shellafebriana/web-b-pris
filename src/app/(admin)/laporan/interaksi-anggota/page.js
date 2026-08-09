import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { parsePeriode } from '@/lib/laporan/periode'
import { getStatusInteraksi } from '@/lib/models/interaksi'
import TabelInteraksi from '@/components/laporan/TabelInteraksi'

export const metadata = { title: 'Laporan Interaksi Anggota' }

export default async function InteraksiAnggotaPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  // Selalu bulanan — periode lain tidak berlaku untuk laporan ini.
  const periode = parsePeriode({ mode: 'bulanan', periode: params.periode })
  const data = await getStatusInteraksi(periode.periode)

  const q = `periode=${periode.periode}`
  const kelas =
    'rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
          Laporan Interaksi Anggota
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pencatatan pengiriman laporan per polsek — {periode.label}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form method="GET" className="flex items-end gap-3">
          <div>
            <label htmlFor="periode" className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">
              Bulan
            </label>
            <input
              id="periode"
              name="periode"
              type="month"
              defaultValue={periode.periode}
              className="rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white">
            Tampilkan
          </button>
        </form>

        <div className="ml-auto flex gap-3">
          <a href={`/api/laporan/interaksi-anggota/export?${q}&type=png`} className={kelas}>
            Download Gambar
          </a>
          <a href={`/api/laporan/interaksi-anggota/export?${q}&type=xlsx`} className={kelas}>
            Download Excel
          </a>
        </div>
      </div>

      <TabelInteraksi periode={periode.periode} data={data} />
    </div>
  )
}