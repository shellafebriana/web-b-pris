import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { getRingkasanViralisasi, getLinkViralisasi } from '@/lib/models/laporan'
import { isValidUrl } from '@/lib/url-utils'
import { ChevronLeftIcon } from '@/icons'
import SalinLinkButton from '@/components/laporan/SalinLinkButton'

const fmtTanggal = (iso) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))

export default async function DetailViralisasiPage({ params, searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { sessionId } = await params
  const sp = await searchParams

  const ringkasan = await getRingkasanViralisasi(sessionId)
  if (!ringkasan) notFound()

  // Whitelist: platform dari URL harus salah satu yang BENERAN ada di sesi ini.
  // Nilai ngaco -> jatuh ke platform pertama, bukan error.
  const diminta = typeof sp?.platform === 'string' ? sp.platform : ''
  const aktif =
    diminta === 'all'
      ? { id: 'all', label: 'Total', nama: 'Semua platform' }
      : ringkasan.platforms.find((p) => p.id === diminta) || ringkasan.platforms[0] || null

  const links = aktif ? await getLinkViralisasi(sessionId, aktif.id) : []
  const jumlahRusak = links.filter((l) => !isValidUrl(l.url)).length

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/laporan/viralisasi-spripim"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeftIcon className="size-4" /> Daftar sesi
        </Link>
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">{ringkasan.judul}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {fmtTanggal(ringkasan.tanggal)}
          {!ringkasan.pakaiContentDate && ' (tanggal dibuat — sesi ini belum punya tanggal konten)'}
          {' · '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {ringkasan.totalLink.toLocaleString('id-ID')} link
          </span>
        </p>
      </div>

      {ringkasan.platforms.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/3 dark:text-gray-400">
          Sesi ini belum ada link-nya.
        </div>
      ) : (
        <>
          {/* Ringkasan per platform — angka ini yang diketik ke tabel statistik PPT */}
          <div className="mb-5 -mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
              {ringkasan.platforms.map((p) => {
                const isAktif = aktif?.id === p.id
                return (
                  <Link
                    key={p.id}
                    href={`/laporan/viralisasi-spripim/${ringkasan.id}?platform=${p.id}`}
                    scroll={false}
                    title={p.nama}
                    className={`flex min-w-24 flex-col items-center rounded-xl border px-4 py-3 transition ${
                      isAktif
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/3'
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase ${isAktif ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {p.label}
                    </span>
                    <span className="mt-0.5 text-xl font-bold text-gray-800 dark:text-white">
                      {p.jumlah.toLocaleString('id-ID')}
                    </span>
                  </Link>
                )
              })}
              <Link
                href={`/laporan/viralisasi-spripim/${ringkasan.id}?platform=all`}
                scroll={false}
                title="Semua platform"
                className={`flex min-w-24 flex-col items-center rounded-xl border px-4 py-3 transition ${
                  aktif?.id === 'all'
                    ? 'border-brand-500 bg-gray-800 dark:bg-gray-800'
                    : 'border-gray-800 bg-gray-800 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <span className="text-xs font-semibold uppercase text-gray-300">Total</span>
                <span className="mt-0.5 text-xl font-bold text-white">
                  {ringkasan.totalLink.toLocaleString('id-ID')}
                </span>
              </Link>
            </div>
          </div>

          {/* Daftar link platform aktif */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{aktif?.nama}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {links.length.toLocaleString('id-ID')} link
                  {jumlahRusak > 0 && ` · ${jumlahRusak} link formatnya gak valid (gak bisa diklik)`}
                </p>
              </div>
              <SalinLinkButton targetId="daftar-link" />
            </div>

            <ul id="daftar-link" className="divide-y divide-gray-100 dark:divide-gray-800">
              {links.map((l) =>
                isValidUrl(l.url) ? (
                  <li key={l.id} className="px-5 py-2">
                    <a
                      data-url={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-sm text-brand-500 hover:underline"
                    >
                      {l.url}
                    </a>
                  </li>
                ) : (
                  <li key={l.id} className="px-5 py-2">
                    <span data-url={l.url} className="block break-all text-sm text-gray-400 line-through">
                      {l.url}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}