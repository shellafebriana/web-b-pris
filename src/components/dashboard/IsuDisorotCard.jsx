import Link from 'next/link'

// Server Component. Pemilih periode pakai <Link> ke searchParams, BUKAN
// useState — halaman tetap Server Component, bisa di-share, dan tetap jalan
// walau JS belum turun.

const PILIHAN = [
  { hari: 1, label: 'Hari ini' },
  { hari: 7, label: '7 hari' },
  { hari: 30, label: '30 hari' },
]

const Tebal = ({ children }) => (
  <strong className="font-medium text-gray-800 dark:text-white/90">{children}</strong>
)

function Badge({ warna, children }) {
  const kelas = {
    danger: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
  }[warna]

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${kelas}`}>
      {children}
    </span>
  )
}

// Lebar pakai persen inline karena nilainya dinamis — Tailwind tidak bisa
// membangkitkan kelas dari variabel runtime.
function BarKanal({ online, sosmed }) {
  const total = online + sosmed
  if (total === 0) return null
  const pOnline = Math.round((online / total) * 100)

  return (
    <div className="mt-2 flex h-1.5 w-full gap-0.5">
      {online > 0 ? (
        <div className="h-full rounded-l-sm bg-blue-light-500" style={{ width: `${pOnline}%` }} />
      ) : null}
      {sosmed > 0 ? (
        <div className="h-full rounded-r-sm bg-orange-600" style={{ width: `${100 - pOnline}%` }} />
      ) : null}
    </div>
  )
}

function kalimatRingkas(daftar, hariAktif) {
  if (daftar.length === 0) return null
  const periode =
    hariAktif === 1 ? 'Hari ini' : `Dalam ${hariAktif} hari terakhir`
  const teratas = daftar[0]

  return (
    <>
      {periode === 'Hari ini' ? 'Hari ini' : periode} ada <Tebal>{daftar.length} peristiwa</Tebal>{' '}
      yang diberitakan lebih dari satu media. Yang paling banyak diliput{' '}
      <Tebal>{teratas.totalItem} media</Tebal>.
    </>
  )
}

const IsuDisorotCard = ({ data, hariAktif = 7 }) => {
  const daftar = Array.isArray(data) ? data : []

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-800 dark:text-white">Isu Paling Disorot</h3>

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
        <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">
          Belum ada peristiwa yang diberitakan lebih dari satu media pada periode ini.
        </p>
      ) : (
        <>
          <p className="mt-2.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {kalimatRingkas(daftar, hariAktif)}
          </p>

          <div className="mt-3.5 divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {daftar.map((isu) => (
              <div key={isu.id} className="py-3.5">
                <p className="text-sm leading-snug text-gray-800 dark:text-white/90">{isu.judul}</p>

                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Diliput <Tebal>{isu.totalItem} media</Tebal>
                  {isu.lamaHari > 1 ? ` selama ${isu.lamaHari} hari` : ''} —{' '}
                  {isu.totalOnline > 0 ? `${isu.totalOnline} media online` : ''}
                  {isu.totalOnline > 0 && isu.totalSosmed > 0 ? ', ' : ''}
                  {isu.totalSosmed > 0 ? `${isu.totalSosmed} akun media sosial` : ''}
                </p>

                <BarKanal online={isu.totalOnline} sosmed={isu.totalSosmed} />
                {isu.medsosSaja ? (
                  <div className="mt-2">
                    <Badge warna="brand">belum diliput media online</Badge>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Arti penanda</p>

            <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-500">
              <span className="mr-1.5 inline-block size-2 rounded-sm bg-blue-light-500" aria-hidden="true" />
              media online
              <span className="ml-3 mr-1.5 inline-block size-2 rounded-sm bg-orange-600" aria-hidden="true" />
              media sosial — panjang batang menunjukkan perbandingan keduanya
            </p>
          </div>

          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
            Dihitung dari berapa media yang memberitakan, bukan dari jumlah penonton.
          </p>
        </>
      )}
    </div>
  )
}

export default IsuDisorotCard