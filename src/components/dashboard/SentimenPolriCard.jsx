import Link from 'next/link'
import { formatNumber } from '@/lib/format-number'

// Server Component. Tanpa chart harian dan tanpa tooltip hover, jadi tidak
// butuh JS di klien sama sekali — kartu tetap utuh walau bundle belum turun.

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function labelPanjang(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  // Rakit di UTC lalu baca di UTC — tidak ikut timezone browser.
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[m - 1]}`
}

const SentimenPolriCard = ({ data }) => {
  const hariNegatif = Array.isArray(data?.hariNegatif) ? data.hariNegatif : []
  const positif = data?.positif ?? 0
  const negatif = data?.negatif ?? 0
  const total = data?.total ?? positif + negatif

  // Persentase dipakai untuk lebar bar; nilainya dinamis jadi harus inline
  // style — Tailwind tidak bisa membangkitkan kelas dari variabel runtime.
  const pPositif = total > 0 ? Math.round((positif / total) * 100) : 0

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <h3 className="font-semibold text-gray-800 dark:text-white">Sentimen Pemberitaan Polri</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">30 hari terakhir</p>

      {total === 0 ? (
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          Belum ada pemberitaan tentang Polri pada periode ini.
        </p>
      ) : (
        <>
          <h4 className="mt-5 font-bold text-title-sm text-gray-800 dark:text-white">
            {data.rasio}%
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            pemberitaan bersifat positif
          </p>

          <div className="mt-4 flex h-1.5 w-full gap-0.5">
            {positif > 0 ? (
              <div
                className="h-full rounded-l-full bg-success-500"
                style={{ width: `${pPositif}%` }}
              />
            ) : null}
            {negatif > 0 ? (
              <div
                className="h-full rounded-r-full bg-error-500"
                style={{ width: `${100 - pPositif}%` }}
              />
            ) : null}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="block size-2 rounded-sm bg-success-500" />
              {formatNumber(positif)} positif
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block size-2 rounded-sm bg-error-500" />
              {formatNumber(negatif)} negatif
            </span>
          </div>

          {hariNegatif.length > 0 ? (
            <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Hari yang perlu diperiksa
              </p>
              <div className="mt-1 divide-y divide-gray-100 dark:divide-gray-800">
                {hariNegatif.slice(0, 5).map((h) => (
                  <Link
                    key={h.tanggal}
                    href={`/monitoring/${h.sesiId}`}
                    className="flex items-center justify-between gap-3 py-2 transition hover:opacity-70"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {labelPanjang(h.tanggal)}
                    </span>
                    <span className="flex-none text-xs text-error-600 dark:text-error-400">
                      {h.negatif} berita negatif
                    </span>
                  </Link>
                ))}
              </div>
              {hariNegatif.length > 5 ? (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  dan {hariNegatif.length - 5} hari lainnya
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default SentimenPolriCard