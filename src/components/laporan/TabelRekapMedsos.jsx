// Sengaja TIDAK pakai lib/format-number.js — helper itu nyingkat angka >=100.000
// jadi "150k", yang gak layak buat laporan resmi yang di-print/di-export.
const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

export default function TabelRekapMedsos({ data, labelJudul }) {
  const { platforms, rows, totalPerPlatform, totalSemua, adaData } = data

  if (!adaData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-white/3">
        <p className="font-medium text-gray-700 dark:text-gray-300">Belum ada data</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Gak ada link untuk periode dan format yang dipilih. Coba ganti periode, atau cek
          apakah sesinya sudah masuk di menu Sesi Rekap.
        </p>
      </div>
    )
  }

  const batasBawah = rows.length - 3

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="border-b border-gray-200 px-5 py-6 text-center dark:border-gray-800">
        <h2 className="text-title-sm font-bold text-gray-800 dark:text-white">POLRESTA BANYUWANGI</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
          KEAKTIFAN VIRALISASI KONTEN MEDIA SOSIAL
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">{labelJudul}</p>
      </div>

      {/* Scroll horizontal + 2 kolom pertama sticky, biar 9 kolom tetap kebaca di HP */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#1449b0] text-white">
              <th className="sticky left-0 z-20 w-14 bg-[#1449b0] px-3 py-3 text-center font-semibold">NO</th>
              <th className="sticky left-14 z-20 bg-[#1449b0] px-5 py-3 text-left font-semibold">POLSEK</th>
              {platforms.map((p) => (
                <th key={p.id} title={p.name} className="px-3 py-3 text-center font-semibold">
                  {p.shortName}
                </th>
              ))}
              <th className="px-5 py-3 text-center font-semibold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const atas = i < 3 && r.total > 0
              const bawah = i >= batasBawah && rows.length > 6
              const bg = atas
                ? 'bg-[#d9f2e4] dark:bg-success-500/10'
                : bawah
                  ? 'bg-[#fee2e2] dark:bg-error-500/10'
                  : 'bg-white dark:bg-gray-900'
              return (
                <tr key={r.unitId} className={`${bg} border-b border-gray-100 dark:border-gray-800`}>
                  <td className={`sticky left-0 z-10 ${bg} px-3 py-3 text-center text-gray-500 dark:text-gray-400`}>
                    {r.rank}
                  </td>
                  <td className={`sticky left-14 z-10 ${bg} whitespace-nowrap px-5 py-3 font-medium text-gray-800 dark:text-gray-200`}>
                    {r.unitName}
                  </td>
                  {platforms.map((p) => (
                    <td key={p.id} className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">
                      {fmt(r.counts[p.id])}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-center font-semibold text-gray-800 dark:text-white">
                    {fmt(r.total)}
                  </td>
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
              {platforms.map((p) => (
                <td key={p.id} className="px-3 py-3 text-center text-gray-800 dark:text-white">
                  {fmt(totalPerPlatform[p.id])}
                </td>
              ))}
              <td className="px-5 py-3 text-center text-gray-800 dark:text-white">{fmt(totalSemua)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}