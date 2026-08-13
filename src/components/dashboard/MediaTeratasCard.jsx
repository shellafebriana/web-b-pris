import { formatNumber } from '@/lib/format-number'

const MediaTeratasCard = ({ data }) => {
  const daftar = Array.isArray(data?.daftar) ? data.daftar : []
  const tertinggi = daftar.length > 0 ? Math.max(...daftar.map((d) => d.jumlah)) : 0

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6 flex h-full flex-col">
      <h3 className="font-semibold text-gray-800 dark:text-white">
        Media Paling Sering Memberitakan
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bulan ini</p>

      {daftar.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          Belum ada data media online bulan ini.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {daftar.map((m) => (
            <div key={m.domain}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300">
                  {m.domain}
                </span>
                <span className="flex-none text-sm font-medium text-gray-800 dark:text-white">
                  {formatNumber(m.jumlah)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-light-500"
                  style={{ width: `${tertinggi > 0 ? Math.round((m.jumlah / tertinggi) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {formatNumber(data?.totalDomain ?? 0)} domain aktif
        {data?.domainBaru > 0 ? ` · ${formatNumber(data.domainBaru)} domain baru bulan ini` : ''}
      </p>
    </div>
  )
}

export default MediaTeratasCard