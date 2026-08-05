'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastProvider'

const API = '/api/laporan/media-online/import'
const BATCH = 25

export default function ImportTxtForm() {
  const router = useRouter()
  const { showToast } = useToast()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [proses, setProses] = useState(null)

  async function analisis() {
    if (!file) return
    setProses({ fase: 'analisis' })
    setPreview(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/analisis`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menganalisis')
      setPreview(json)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setProses(null)
    }
  }

  async function simpan() {
    const groups = preview.groups
    const total = groups.length
    const akum = { dibuat: 0, ditambah: 0, link: 0, dilewati: 0, gagal: 0 }

    for (let i = 0; i < total; i += BATCH) {
      setProses({ fase: 'simpan', kini: Math.min(i + BATCH, total), total })
      const res = await fetch(`${API}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: groups.slice(i, i + BATCH) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setProses(null)
        showToast(json.error || 'Gagal menyimpan', 'error')
        return
      }
      for (const k of Object.keys(akum)) akum[k] += json[k] || 0
    }

    setProses(null)
    setPreview(null)
    setFile(null)
    showToast(
      `${akum.dibuat} sesi baru, ${akum.ditambah} sesi ditambah, ${akum.link} link masuk, ${akum.dilewati} dilewati`,
      akum.gagal > 0 ? 'error' : 'success'
    )
    router.refresh()
  }

  const s = preview?.statistik

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          File .txt hasil export chat WhatsApp
        </label>
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null) }}
          className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white dark:text-gray-400"
        />
        <p className="mt-2 text-xs text-gray-500">Mendukung export Android maupun iPhone. Maksimal 12MB.</p>
        <button
          onClick={analisis}
          disabled={!file || proses}
          className="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {proses?.fase === 'analisis' ? 'Menganalisis…' : 'Analisis File'}
        </button>
      </div>

      {preview && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Hasil Analisis</h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Baris dibaca', s.baris],
              ['URL ditemukan', s.urlDitemukan],
              ['URL unik', s.urlUnik],
              ['Artikel', s.artikel],
              ['Sudah ada di DB', s.sudahAdaDiDb],
              ['Akan disimpan', s.akanDisimpan],
            ].map(([label, nilai]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">
                  {new Intl.NumberFormat('id-ID').format(nilai)}
                </p>
              </div>
            ))}
          </div>

          {preview.ditolakTotal > 0 && (
            <details className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
              <summary className="cursor-pointer text-sm font-medium text-warning-700 dark:text-warning-400">
                {preview.ditolakTotal} link ditolak — klik buat lihat
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
                {preview.ditolak.map((d, i) => (
                  <li key={i} className="break-all">
                    <span className="font-medium">{d.alasan}</span> — {d.url}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <RingkasanUnit preview={preview} />

          <button
            onClick={simpan}
            disabled={proses || s.akanDisimpan === 0}
            className="mt-5 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {proses?.fase === 'simpan'
              ? `Menyimpan ${proses.kini}/${proses.total} artikel…`
              : `Simpan ${s.akanDisimpan} link`}
          </button>
          {s.akanDisimpan === 0 && (
            <p className="mt-2 text-sm text-gray-500">Semua link di file ini sudah ada di database.</p>
          )}
        </div>
      )}
    </div>
  )
}

function RingkasanUnit({ preview }) {
  const baris = Object.entries(preview.perUnitTanggal)
    .map(([unitId, perTgl]) => ({
      nama: preview.namaUnit[unitId] || unitId,
      total: Object.values(perTgl).reduce((a, b) => a + b, 0),
      hari: Object.keys(perTgl).length,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <details className="mt-4" open>
      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
        Ringkasan per polsek ({baris.length})
      </summary>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Polsek</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Hari aktif</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Link</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.nama} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{b.nama}</td>
                <td className="px-4 py-2 text-center text-gray-500">{b.hari}</td>
                <td className="px-4 py-2 text-center font-medium text-gray-800 dark:text-white">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}