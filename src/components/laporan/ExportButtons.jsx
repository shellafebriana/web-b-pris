export default function ExportButtons({ jenis, periode, disabled }) {
  const q = `mode=${periode.mode}&periode=${encodeURIComponent(periode.periode)}`
  const base = `/api/laporan/rekap/${jenis}/export`

  const kelas =
    'rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800'

  if (disabled) {
    return (
      <div className="flex gap-3">
        <span className={`${kelas} cursor-not-allowed opacity-50`}>Download Gambar</span>
        <span className={`${kelas} cursor-not-allowed opacity-50`}>Download Excel</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a href={`${base}?${q}&type=png`} className={kelas}>Download Gambar</a>
      <a href={`${base}?${q}&type=xlsx`} className={kelas}>Download Excel</a>
    </div>
  )
}