const UnitRankingTable = ({ data }) => {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  // Check if data is null atau empty
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
            Keaktifan Polsek dalam Amplifikasi Media Sosial Bulan {new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Tidak ada data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 dark:bg-gray-800">
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
        Keaktifan Polsek dalam Amplifikasi Media Sosial Bulan {new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
      </h3>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                No
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Nama Unit
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                Jumlah Link
              </th>
            </tr>
          </thead>

          {/* Body - Striped rows */}
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-gray-100 dark:border-gray-700 ${
                  idx % 2 === 0 
                    ? 'bg-white dark:bg-gray-800' 
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {row.no}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                  {row.namaUnit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-semibold text-right">
                  {row.jumlahLink.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UnitRankingTable