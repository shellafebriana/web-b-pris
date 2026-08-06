// Sengaja TIDAK pakai lib/format-number.js — helper itu nyingkat >=100.000 jadi "150k",
// gak layak buat laporan resmi yang di-print.
const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

export default function TabelRekap({ data, judulCetak, labelJudul, kolomEntitas = 'POLSEK' }) {
  const { columns, rows, totalPerColumn, totalSemua, adaData } = data
  const pakaiTotal = columns.length > 1

  if (!adaData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-white/3">
        <p className="font-medium text-gray-700 dark:text-gray-300">Belum ada data</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Gak ada link untuk periode ini. Coba ganti periode, atau cek apakah sesinya sudah
          masuk di menu Sesi Rekap.
        </p>
      </div>
    )
  }

  const batasBawah = rows.length - 3
  const lebarMin = 320 + columns.length * 80

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="border-b border-gray-200 px-5 py-6 text-center dark:border-gray-800">
        <h2 className="text-title-sm font-bold text-gray-800 dark:text-white">POLRESTA BANYUWANGI</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 sm:text-base">{judulCetak}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">{labelJudul}</p>
      </div>

      {/* Scroll horizontal + 2 kolom pertama sticky, biar tetap kebaca di HP */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: `${lebarMin}px` }}>
          <thead>
            <tr className="bg-[#1449b0] text-white">
              <th className="sticky left-0 z-20 w-14 bg-[#1449b0] px-3 py-3 text-center font-semibold">NO</th>
              <th className="sticky left-14 z-20 bg-[#1449b0] px-5 py-3 text-left font-semibold">{kolomEntitas}</th>
              {columns.map((c) => (
                <th key={c.key} title={c.subLabel || ''} className="px-3 py-3 text-center font-semibold">
                  <span className="block">{c.label}</span>
                </th>
              ))}
              {pakaiTotal && <th className="px-5 py-3 text-center font-semibold">TOTAL</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const atas = i < 3 && r.total > 0
              const bawah = i >= batasBawah && rows.length > 6
              const bg = atas
                ? 'bg-[#d9f2e4] dark:bg-success-500/10'
                : bawah
                  ? 'bg-[#fbdedc] dark:bg-error-500/10'
                  : 'bg-white dark:bg-gray-900'
              return (
                <tr key={r.id} className={`${bg} border-b border-gray-100 dark:border-gray-800`}>
                  <td className={`sticky left-0 z-10 ${bg} px-3 py-3 text-center text-gray-500 dark:text-gray-400`}>
                    {r.rank}
                  </td>
                  <td className={`sticky left-14 z-10 ${bg} whitespace-nowrap px-5 py-3 font-medium text-gray-800 dark:text-gray-200`}>
                    {r.name}
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">
                      {fmt(r.counts[c.key])}
                    </td>
                  ))}
                  {pakaiTotal && (
                    <td className="px-5 py-3 text-center font-semibold text-gray-800 dark:text-white">
                      {fmt(r.total)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold dark:bg-gray-800">
              <td className="sticky left-0 z-10 bg-gray-100 px-3 py-3 dark:bg-gray-800" />
              <td className="sticky left-14 z-10 bg-gray-100 px-5 py-3 text-gray-800 dark:bg-gray-800 dark:text-white">
                TOTAL
              </td>
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-3 text-center text-gray-800 dark:text-white">
                  {fmt(totalPerColumn[c.key])}
                </td>
              ))}
              {pakaiTotal && (
                <td className="px-5 py-3 text-center text-gray-800 dark:text-white">{fmt(totalSemua)}</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}