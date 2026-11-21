'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useToast } from '@/context/ToastProvider'

const KELAS_TOMBOL_GARIS =
  'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50'

function Kotak({ judul, keterangan, kanan, children, tombol }) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-2.5 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{judul}</p>
          {keterangan ? <p className="text-xs text-gray-400 dark:text-gray-500">{keterangan}</p> : null}
        </div>
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{kanan}</span>
      </div>
      {children}
      {tombol ? (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">{tombol}</div>
      ) : null}
    </div>
  )
}

export default function LaporanPanel({ sesiId, tanggal, formats, formatAktif, teks, error, prompt }) {
  const { showToast } = useToast()
  const [tersalin, setTersalin] = useState(null) // 'laporan' | 'prompt' | null

  async function salin(jenis, isi) {
    if (!isi) return
    try {
      // Clipboard API butuh HTTPS/localhost. Kalau ditolak, beri tahu cara manualnya.
      await navigator.clipboard.writeText(isi)
      setTersalin(jenis)
      showToast(
        jenis === 'prompt'
          ? 'Prompt disalin. Silakan tempel di ChatGPT bersama file TXT.'
          : 'Laporan disalin. Silakan tempel ke WhatsApp.',
        'success'
      )
      setTimeout(() => setTersalin(null), 2500)
    } catch {
      showToast('Gagal menyalin. Silakan blok teksnya lalu tekan Ctrl+C.', 'error')
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

  const adaPrompt = Boolean(prompt)

  return (
    <div>
      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
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

      {error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-5 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${adaPrompt ? 'lg:grid-cols-2' : ''}`}>
          <Kotak
            judul={adaPrompt ? '1. Isi laporan' : 'Isi laporan'}
            keterangan={adaPrompt ? 'Unduh sebagai file TXT lalu unggah ke ChatGPT' : null}
            kanan={teks ? `${teks.length.toLocaleString('id-ID')} karakter` : ''}
            tombol={
              <>
                <button type="button" onClick={unduh} disabled={!teks} className={KELAS_TOMBOL_GARIS}>
                  Unduh .txt
                </button>
                <button type="button" onClick={() => salin('laporan', teks)} disabled={!teks} className={KELAS_TOMBOL_UTAMA}>
                  {tersalin === 'laporan' ? 'Tersalin' : 'Salin laporan'}
                </button>
              </>
            }
          >
            {/* whitespace-pre-wrap: spasi dan baris baru dipertahankan apa adanya,
                karena format WhatsApp bergantung pada posisi barisnya. */}
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {teks}
            </pre>
          </Kotak>

          {adaPrompt ? (
            <Kotak
              judul="2. Prompt Patroli Digital"
              keterangan="Tempel di ChatGPT bersama file TXT"
              kanan={prompt.teks ? `${prompt.teks.length.toLocaleString('id-ID')} karakter` : ''}
              tombol={
                prompt.teks ? (
                  <button type="button" onClick={() => salin('prompt', prompt.teks)} className={KELAS_TOMBOL_UTAMA}>
                    {tersalin === 'prompt' ? 'Tersalin' : 'Salin prompt'}
                  </button>
                ) : null
              }
            >
              {prompt.teks ? (
                <>
                  <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                    {['Master prompt', `${prompt.jumlahIsu} isu, 3 hari sebelumnya`, 'Aturan keluaran'].map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {prompt.teks}
                  </pre>
                </>
              ) : (
                <div className="px-5 py-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Master prompt belum diisi.
                  </p>
                  <Link
                    href="/pengaturan-monitoring/prompt"
                    className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    Isi di Pengaturan Monitoring → Prompt
                  </Link>
                </div>
              )}
            </Kotak>
          ) : null}
        </div>
      )}
    </div>
  )
}