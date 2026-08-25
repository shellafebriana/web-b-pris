import Link from 'next/link'
import { formatNumber } from '@/lib/format-number'

// Grafik batang dirender sebagai div ber-height persen, bukan library chart:
// tidak butuh JS di klien, jadi tetap tampil walau sinyal merah.
// Detail per hari muncul lewat atribut title (hover) — juga tanpa JS.

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function labelPanjang(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  // Rakit di UTC lalu baca di UTC — tidak ikut timezone browser.
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[m - 1]}`
}

function labelHover(d) {
  const total = d.positif + d.negatif
  if (total === 0) return `${labelPanjang(d.tanggal)} — tidak ada monitoring`
  const bagian = [`${d.positif} positif`]
  if (d.negatif > 0) bagian.push(`${d.negatif} negatif`)
  return `${labelPanjang(d.tanggal)} — ${bagian.join(', ')}`
}

const SentimenPolriCard = ({ data }) => {
  const deret = Array.isArray(data?.deret) ? data.deret : []
  const hariNegatif = Array.isArray(data?.hariNegatif) ? data.hariNegatif : []
  const puncak = deret.reduce((a, d) => Math.max(a, d.positif + d.negatif), 0)
  const total = data?.total ?? (data?.positif ?? 0) + (data?.negatif ?? 0)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-semibold text-gray-800 dark:text-white">Sentimen Pemberitaan Polri</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">30 hari terakhir</span>
      </div>

      {deret.length === 0 || total === 0 ? (
        <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">
          Belum ada pemberitaan tentang Polri pada periode ini.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-3xl font-medium leading-none text-success-600 dark:text-success-500">
              {data.rasio}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              pemberitaan bersifat positif
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {formatNumber(data.positif)} dari {formatNumber(total)} berita tentang Polri bersifat
            positif.{' '}
            {data.negatif > 0 ? (
              <>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {formatNumber(data.negatif)} berita
                </span>{' '}
                bersifat negatif.
              </>
            ) : (
              'Tidak ada berita bersifat negatif.'
            )}
          </p>

          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <div
              className="relative flex h-16 items-end gap-0.5"
              role="img"
              aria-label={`Grafik harian: ${formatNumber(data.positif)} berita positif, ${formatNumber(data.negatif)} berita negatif`}
            >
              {deret.map((d, i) => {
                const jml = d.positif + d.negatif
                const tinggi =
                  puncak > 0 ? Math.max(Math.round((jml / puncak) * 100), jml > 0 ? 14 : 0) : 0
                const pNegatif = jml > 0 ? Math.round((d.negatif / jml) * 100) : 0

                // Tooltip digeser di ujung kiri/kanan supaya tidak terpotong.
                const dekatKiri = i < 3
                const dekatKanan = i > deret.length - 4
                const posisi = dekatKiri
                  ? 'left-0'
                  : dekatKanan
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2'

                return (
                  <div key={d.tanggal} className="group relative flex h-full flex-1 flex-col justify-end">
                    {/* Tooltip CSS murni — tanpa JS, jadi tetap jalan di
                        Server Component dan saat bundle belum turun. */}
                    <div
                      className={`pointer-events-none absolute bottom-full z-20 mb-1.5 w-max max-w-[180px] rounded-lg bg-gray-900 px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-700 ${posisi}`}
                    >
                      <p className="text-xs font-medium text-white">{labelPanjang(d.tanggal)}</p>
                      {jml === 0 ? (
                        <p className="mt-0.5 text-xs text-gray-400">Tidak ada monitoring</p>
                      ) : (
                        <>
                          <p className="mt-0.5 text-xs text-success-400">{d.positif} berita positif</p>
                          {d.negatif > 0 ? (
                            <p className="text-xs text-error-400">{d.negatif} berita negatif</p>
                          ) : null}
                        </>
                      )}
                    </div>

                    {/* Area hover setinggi penuh, supaya tidak perlu mengarahkan
                        kursor tepat ke ujung batang yang pendek. */}
                    <div className="absolute inset-0" aria-hidden="true" />

                    {jml === 0 ? (
                      <div className="h-0.5 w-full rounded-sm bg-gray-100 transition-colors group-hover:bg-gray-300 dark:bg-gray-800 dark:group-hover:bg-gray-600" />
                    ) : (
                      <div
                        className="w-full overflow-hidden rounded-sm transition-opacity group-hover:opacity-80"
                        style={{ height: `${tinggi}%` }}
                      >
                        {d.negatif > 0 ? (
                          <div className="w-full bg-error-500" style={{ height: `${pNegatif}%` }} />
                        ) : null}
                        {d.positif > 0 ? (
                          <div className="w-full bg-success-500" style={{ height: `${100 - pNegatif}%` }} />
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Titik penanda: merah di dalam batang hijau terlalu tipis untuk
                terlihat, jadi hari bernegatif ditandai di bawah sumbu. */}
            <div className="mt-1 flex gap-0.5" aria-hidden="true">
              {deret.map((d) => (
                <div key={d.tanggal} className="flex flex-1 justify-center">
                  {d.negatif > 0 ? (
                    <span className="block size-1.5 rounded-full bg-error-500" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {hariNegatif.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="mb-1.5 text-sm font-medium text-gray-800 dark:text-white/90">
                Hari yang perlu diperiksa
              </p>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {hariNegatif.slice(0, 5).map((h) => (
                  <Link
                    key={h.tanggal}
                    href={`/monitoring/${h.sesiId}`}
                    className="flex items-center justify-between gap-3 py-1.5 transition hover:opacity-70"
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