import Link from 'next/link'

// Server Component. Pemilih periode pakai <Link> ke searchParams, BUKAN
// useState — halaman tetap Server Component, bisa di-share, dan tetap jalan
// walau JS belum turun.

const PILIHAN = [
  { hari: 1, label: 'Hari ini' },
  { hari: 7, label: '7 hari' },
  { hari: 30, label: '30 hari' },
]

function Badge({ warna, children }) {
  const kelas = {
    danger: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    brand: 'bg-brand-50 text-brand-500 dark:bg-orange-500/15 dark:text-brand-400',
  }[warna]

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${kelas}`}>
      {children}
    </span>
  )
}

// Bar proporsi online vs sosmed. Lebar pakai persen inline karena nilainya
// dinamis — Tailwind tidak bisa membangkitkan kelas dari variabel.
function BarKanal({ online, sosmed }) {
  const total = online + sosmed
  if (total === 0) return null
  const pOnline = Math.round((online / total) * 100)

  return (
    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      {online > 0 ? (
        <div className="h-full bg-blue-light-500" style={{ width: `${pOnline}%` }} />
      ) : null}
      {sosmed > 0 ? (
        <div className="h-full bg-orange-500" style={{ width: `${100 - pOnline}%` }} />
      ) : null}
    </div>
  )
}

const IsuDisorotCard = ({ data, hariAktif = 7 }) => {
  const daftar = Array.isArray(data) ? data : []

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">Isu Paling Disorot</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Diurutkan dari jumlah sumber yang meliput
          </p>
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {PILIHAN.map((p) => (
            <Link
              key={p.hari}
              href={`/dashboard?isuHari=${p.hari}`}
              scroll={false}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                hariAktif === p.hari
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {daftar.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
          Belum ada isu yang terdeteksi pada periode ini.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-800">
          {daftar.map((isu) => (
            <div key={isu.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-sm text-gray-800 dark:text-white/90">{isu.judul}</p>
                <div className="flex flex-none flex-wrap justify-end gap-1.5">
                  {isu.naik ? <Badge warna="danger">naik</Badge> : null}
                  {isu.terbelah ? <Badge warna="warning">terbelah</Badge> : null}
                  {isu.medsosSaja ? <Badge warna="brand">medsos saja</Badge> : null}
                </div>
              </div>

              <BarKanal online={isu.totalOnline} sosmed={isu.totalSosmed} />

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300">{isu.totalItem} sumber</span>
                <span aria-hidden="true">·</span>
                <span>
                  {isu.totalOnline} online · {isu.totalSosmed} medsos
                </span>
                {isu.lamaHari > 1 ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>bertahan {isu.lamaHari} hari</span>
                  </>
                ) : null}
                {isu.medsosSaja ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>belum diliput media online</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-blue-light-500" aria-hidden="true" />
          Media online
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-orange-500" aria-hidden="true" />
          Media sosial
        </span>
        <span className="ml-auto text-gray-400 dark:text-gray-500">
          berdasarkan liputan, bukan jumlah penonton
        </span>
      </div>
    </div>
  )
}

export default IsuDisorotCard