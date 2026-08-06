const NAMA_HARI = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']

/** Server Component — strip kalender, nol JS. */
export default function PanelKelengkapan({ data, labelPeriode }) {
  if (!data) return null

  const { hariAkhir, offset, hariEfektif, perTanggal, hariAda, hariKosong } = data
  const sel = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: hariAkhir }, (_, i) => i + 1),
  ]
  const lengkap = hariKosong === 0

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          Kelengkapan Data — {labelPeriode}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            lengkap
              ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
              : 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
          }`}
        >
          {lengkap
            ? `Lengkap — ${hariAda} hari terisi`
            : `${hariKosong} dari ${hariEfektif} hari belum ada data`}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {NAMA_HARI.map((h) => (
          <div key={h} className="pb-1 text-center text-[11px] font-medium text-gray-400">
            {h}
          </div>
        ))}
        {sel.map((d, i) => {
          if (d === null) return <div key={`x${i}`} />
          const isi = perTanggal[d]
          const belumTiba = d > hariEfektif
          const warna = belumTiba
            ? 'border-dashed border-gray-200 text-gray-300 dark:border-gray-800 dark:text-gray-700'
            : isi
              ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
              : 'border-error-200 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400'
          return (
            <div
              key={d}
              title={
                belumTiba
                  ? 'Belum tiba'
                  : isi
                    ? `${isi.link} link dari ${isi.sesi} sesi`
                    : 'Belum ada data'
              }
              className={`flex flex-col items-center justify-center rounded-lg border py-1.5 ${warna}`}
            >
              <span className="text-xs font-semibold">{d}</span>
              <span className="text-[10px] leading-tight opacity-80">
                {belumTiba ? '·' : isi ? isi.link : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {!lengkap && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Angka di tabel bawah belum final. Hari yang kosong bisa ditambal lewat Impor Susulan.
        </p>
      )}
    </div>
  )
}