import { formatNumber } from '@/lib/format-number'

// Grafik batang dirender sebagai div ber-height persen, bukan library chart:
// tidak butuh JS di klien, jadi tetap tampil walau sinyal merah.

function labelTanggal(iso) {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

const SentimenPolriCard = ({ data }) => {
  const deret = Array.isArray(data?.deret) ? data.deret : []
  const puncak = deret.reduce((a, d) => Math.max(a, d.positif + d.negatif), 0)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          Sentimen Pemberitaan Polri
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">30 hari terakhir</span>
      </div>

      {deret.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          Belum ada data pemberitaan Polri pada periode ini.
        </p>
      ) : (
        <>
          <div
            className="mt-5 flex min-h-32 flex-1 items-end gap-1"
            role="img"
            aria-label={`Grafik harian: ${formatNumber(data.positif)} berita positif, ${formatNumber(data.negatif)} berita negatif`}
          >
            {deret.map((d) => {
              const total = d.positif + d.negatif
              const tinggi =
                puncak > 0 ? Math.max(Math.round((total / puncak) * 100), total > 0 ? 14 : 0) : 0
              const pNegatif = total > 0 ? Math.round((d.negatif / total) * 100) : 0

              return (
                <div
                  key={d.tanggal}
                  className="flex h-full flex-1 flex-col justify-end"
                  title={`${labelTanggal(d.tanggal)} — positif ${d.positif}, negatif ${d.negatif}`}
                >
                  {total === 0 ? (
                    <div className="h-0.5 w-full rounded-sm bg-gray-100 dark:bg-gray-800" />
                  ) : (
                    <div className="w-full overflow-hidden rounded-sm" style={{ height: `${tinggi}%` }}>
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

          {/* Label tanggal: cuma tiap beberapa batang, kalau semua ditulis
              30 angka akan tumpang tindih dan malah tidak terbaca. */}
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {deret.map((d, i) => {
              const langkah = Math.max(Math.ceil(deret.length / 6), 1)
              const tampil = i % langkah === 0 || i === deret.length - 1
              return (
                <span
                  key={d.tanggal}
                  className="flex-1 text-center text-[10px] leading-none text-gray-400 dark:text-gray-500"
                >
                  {tampil ? labelTanggal(d.tanggal) : ''}
                </span>
              )
            })}
          </div>

          <p className="mt-2.5 text-xs text-gray-400 dark:text-gray-500">
            Tiap batang = 1 hari. Tinggi batang = jumlah berita tentang Polri hari itu,
            merah bagian yang negatif. Garis tipis = tidak ada monitoring hari itu.
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="size-2 rounded-sm bg-success-500" aria-hidden="true" />
          Positif {formatNumber(data?.positif ?? 0)}
        </span>
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="size-2 rounded-sm bg-error-500" aria-hidden="true" />
          Negatif {formatNumber(data?.negatif ?? 0)}
        </span>
        {data?.rasio !== null && data?.rasio !== undefined ? (
          <span className="ml-auto font-medium text-gray-700 dark:text-gray-300">
            {data.rasio}% positif
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default SentimenPolriCard