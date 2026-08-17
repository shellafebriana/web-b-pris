'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useToast } from '@/context/ToastProvider'

export default function LaporanPanel({ sesiId, tanggal, formats, formatAktif, teks, error }) {
  const { showToast } = useToast()
  const [tersalin, setTersalin] = useState(false)

  async function salin() {
    if (!teks) return
    try {
      await navigator.clipboard.writeText(teks)
      setTersalin(true)
      showToast('Laporan disalin, tinggal tempel ke WhatsApp', 'success')
      setTimeout(() => setTersalin(false), 2500)
    } catch {
      // Clipboard API butuh HTTPS/localhost — kalau ditolak, jangan diam saja.
      showToast('Gagal menyalin. Blok teksnya lalu tekan Ctrl+C.', 'error')
    }
  }

  function unduh() {
    if (!teks) return
    const nama = formats.find((f) => f.id === formatAktif)?.name ?? 'laporan'
    const berkas = `${nama.replace(/[^\w-]+/g, '-')}-${tanggal}.txt`
    const blob = new Blob([teks], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = berkas
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {formats.map((f) => (
            <Link
              key={f.id}
              href={`/monitoring/${sesiId}/laporan?format=${f.id}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                f.id === formatAktif
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {f.name}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={unduh}
            disabled={!teks}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Unduh .txt
          </button>
          <button
            type="button"
            onClick={salin}
            disabled={!teks}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {tersalin ? 'Tersalin' : 'Salin laporan'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-5 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-2.5 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Pratinjau — persis seperti yang akan tertempel di WhatsApp
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {teks ? `${teks.length.toLocaleString('id-ID')} karakter` : ''}
            </span>
          </div>
          {/* whitespace-pre-wrap: spasi dan baris baru dipertahankan apa adanya,
              karena format WhatsApp bergantung pada posisi barisnya. */}
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {teks}
          </pre>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Tanda bintang di teks adalah penanda tebal WhatsApp. Jangan dihapus.
      </p>
    </div>
  )
}