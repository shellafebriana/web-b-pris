import Link from 'next/link'
import { formatNumber } from '@/lib/format-number'

// Server Component. Pemilih bulan pakai <Link>, bukan <select onChange> —
// halaman tetap Server Component dan tetap jalan walau JS belum turun.

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function labelTanggal(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  // Rakit di UTC lalu baca di UTC — tidak ikut timezone browser/server.
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`
}

function labelBulan(bulan) {
  const [y, m] = bulan.split('-').map(Number)
  return `${BULAN[m - 1]} ${y}`
}

const MonitoringSesiList = ({ daftar, ringkas, bulan, daftarBulan }) => {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[
          { label: 'Hari termonitor', nilai: `${ringkas.jumlahSesi} / ${ringkas.jumlahHari}` },
          { label: 'Item media online', nilai: formatNumber(ringkas.totalOnline) },
          { label: 'Item media sosial', nilai: formatNumber(ringkas.totalSosmed) },
          {
            label: 'Perlu review',
            nilai: formatNumber(ringkas.totalReview),
            kelas: ringkas.totalReview > 0 ? 'text-warning-600 dark:text-warning-500' : undefined,
          },
        ].map((k) => {
          const isi = (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">{k.label}</span>
              <h4 className={`mt-2 font-bold text-title-sm ${k.kelas ?? 'text-gray-800 dark:text-white'}`}>
                {k.nilai}
              </h4>
            </>
          )
          const kelasKartu =
            'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 md:p-5'

          if (k.label === 'Perlu review' && ringkas.totalReview > 0) {
            return (
              <Link
                key={k.label}
                href={`/monitoring/review?bulan=${bulan}`}
                className={`${kelasKartu} block transition hover:border-warning-400 hover:shadow-sm`}
              >
                {isi}
                <span className="mt-1 block text-xs text-warning-600 dark:text-warning-500">
                  Klik untuk memperbaiki
                </span>
              </Link>
            )
          }
          return (
            <div key={k.label} className={kelasKartu}>
              {isi}
            </div>
          )
        })}
      </div>
      
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {daftarBulan.slice(0, 12).map((b) => (
          <Link
            key={b}
            href={`/monitoring?bulan=${b}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              b === bulan
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {labelBulan(b)}
          </Link>
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
                      {d.adaSesi ? (
                        <>
                          {formatNumber(d.totalItem)} item
                          {d.perluReview > 0 ? (
                            <span className="text-warning-600 dark:text-warning-500">
                              {' '}· {formatNumber(d.perluReview)} perlu review
                            </span>
                          ) : null}
                        </>
                      ) : (
                        'Belum ada sesi'
                      )}
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
                        Draft
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