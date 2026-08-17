import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getSesiDetail, getFormatMonitoring, generateLaporanMonitoring } from '@/lib/models/monitoring'
import LaporanPanel from '@/components/monitoring/LaporanPanel'

export default async function LaporanMonitoringPage({ params, searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params
  const sp = await searchParams

  const [sesi, formats] = await Promise.all([
    getSesiDetail(id),
    getFormatMonitoring(),
  ])
  if (!sesi) notFound()

  // Whitelist: formatId harus ada di daftar format monitoring yang aktif.
  const diminta = typeof sp?.format === 'string' ? sp.format : null
  const formatDipakai = formats.find((f) => f.id === diminta) ?? formats[0] ?? null

  let teks = null
  let error = null
  if (formatDipakai) {
    try {
      const hasil = await generateLaporanMonitoring(sesi.id, formatDipakai.id)
      teks = hasil.teks
    } catch (e) {
      error = e.message
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/monitoring/${sesi.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          &larr; Kembali ke sesi
        </Link>
        <h1 className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white">
          Laporan Monitoring
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {sesi.totalOnline} media online · {sesi.totalSosmed} media sosial
        </p>
      </div>

      {formats.length === 0 ? (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-5 dark:border-warning-500/30 dark:bg-warning-500/10">
          <p className="text-sm text-warning-700 dark:text-orange-400">
            Belum ada format monitoring. Buat dulu di menu Format Rekap, lalu tandai
            format itu sebagai jenis monitoring.
          </p>
        </div>
      ) : (
        <LaporanPanel
          sesiId={sesi.id}
          tanggal={sesi.tanggal}
          formats={formats}
          formatAktif={formatDipakai?.id ?? null}
          teks={teks}
          error={error}
        />
      )}
    </div>
  )
}