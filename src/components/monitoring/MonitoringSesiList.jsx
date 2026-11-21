import Link from 'next/link'
import { formatNumber } from '@/lib/format-number'


const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function labelTanggal(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  // Rakit di UTC lalu baca di UTC — tidak ikut timezone browser/server.
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`
}

const KARTU = [
  { label: 'Hari termonitor', nilai: (r) => `${r.jumlahSesi} / ${r.jumlahHari}` },
  { label: 'Item media online', nilai: (r) => formatNumber(r.totalOnline) },
  { label: 'Item media sosial', nilai: (r) => formatNumber(r.totalSosmed) },
]


const MonitoringSesiList = ({ daftar, ringkas }) => {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {KARTU.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 md:p-5"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{k.label}</span>
            <h4 className="mt-2 font-bold text-title-sm text-gray-800 dark:text-white">
              {k.nilai(ringkas)}
            </h4>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-3 py-3 text-center font-medium">Online</th>
                <th className="px-3 py-3 text-center font-medium">Sosmed</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {daftar.map((d) => (
                <tr
                  key={d.tanggal}
                  className={d.adaSesi ? '' : 'bg-gray-50/60 dark:bg-gray-900/20'}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-sm ${d.adaSesi ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      {labelTanggal(d.tanggal)}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
                      {d.adaSesi ? `${formatNumber(d.totalItem)} item` : 'Belum ada sesi'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center text-sm text-gray-700 dark:text-gray-300">
                    {d.adaSesi ? formatNumber(d.totalOnline) : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-center text-sm text-gray-700 dark:text-gray-300">
                    {d.adaSesi ? formatNumber(d.totalSosmed) : '—'}
                  </td>
                  <td className="px-3 py-3.5">
                    {!d.adaSesi ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Kosong</span>
                    ) : d.state === 'final' ? (
                      <span className="inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                        Final
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">
                        Draf
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={d.adaSesi ? `/monitoring/${d.sesiId}` : `/monitoring/baru?tanggal=${d.tanggal}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {d.adaSesi ? 'Buka' : 'Buat'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MonitoringSesiList