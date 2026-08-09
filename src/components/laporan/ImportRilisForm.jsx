'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastProvider'

const API = '/api/laporan/konten-rayon/import'

export default function ImportRilisForm() {
  const router = useRouter()
  const { showToast } = useToast()
  const [files, setFiles] = useState([])
  const [preview, setPreview] = useState(null)
  const [proses, setProses] = useState(null)
  const [pemetaan, setPemetaan] = useState({})

  async function kirim(aksi) {
    if (!files.length) return
    setProses(aksi)
    try {
      const fd = new FormData()
      for (const f of files) fd.append('file', f)
      fd.append('aksi', aksi)
      fd.append('pemetaan', JSON.stringify(pemetaan))
      const res = await fetch(API, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses')

      if (aksi === 'preview') {
        setPreview(json)
      } else {
        showToast(`${json.dibuat} rilis tersimpan, ${json.dilewati} dilewati`, 'success')
        setPreview(null); setFiles([]); setPemetaan({})
        router.refresh()
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setProses(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          File .txt export grup rayon (bisa pilih banyak sekaligus)
        </label>
        <input
          type="file"
          accept=".txt,text/plain"
          multiple
          onChange={(e) => { setFiles([...(e.target.files || [])]); setPreview(null) }}
          className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white dark:text-gray-400"
        />
        <p className="mt-2 text-xs text-gray-500">
          Untuk Juli 2026 sertakan juga export grup Bahan Viral — sebelum pertengahan Juli semua
          polsek masih kirim ke satu grup.
        </p>
        {files.length > 0 && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {files.length} file dipilih: {files.map((f) => f.name).join(', ')}
          </p>
        )}
        <button
          onClick={() => kirim('preview')}
          disabled={!files.length || proses}
          className="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {proses === 'preview' ? 'Menganalisis…' : 'Analisis File'}
        </button>
      </div>

      {preview && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Hasil Analisis</h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Rilis terbaca', preview.total],
              ['Sudah ada di DB', preview.sudahAda],
              ['Akan disimpan', preview.akanDisimpan],
              ['Tak dikenali', preview.takDikenaliTotal],
            ].map(([label, nilai]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">{nilai}</p>
              </div>
            ))}
          </div>

          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              Rincian per file ({preview.perFile.length})
            </summary>
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">File</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Rayon</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Pesan</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Rilis</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.perFile.map((f) => (
                    <tr key={f.nama} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="max-w-xs truncate px-3 py-2 text-gray-800 dark:text-gray-200" title={f.nama}>
                        {f.nama}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{f.rayon ?? '—'}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{f.pesan}</td>
                      <td className="px-3 py-2 text-center font-medium text-gray-800 dark:text-white">{f.rilis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {preview.perluTinjauTotal > 0 && (
            <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
              <p className="text-sm font-medium text-warning-700 dark:text-warning-400">
                {preview.perluTinjauTotal} pesan berbentuk rilis tapi polseknya belum terbaca
              </p>
              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400/80">
                Pilih polseknya lalu klik Analisis lagi. Yang dibiarkan kosong tidak akan disimpan.
              </p>
              <ul className="mt-3 space-y-3">
                {preview.perluTinjau.map((t) => (
                  <li
                    key={t.kunci}
                    className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {t.tanggal.d}/{t.tanggal.m}/{t.tanggal.y}
                      </span>
                      <span>·</span>
                      <span>{t.pengirim}</span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{t.alasan}</span>
                      <span className="text-gray-400">{t.baris} baris</span>
                    </div>

                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        <span className="line-clamp-2 group-open:hidden">{t.teks}</span>
                        <span className="mt-1 inline-block font-medium text-brand-500">
                          <span className="group-open:hidden">Lihat isi lengkap ▾</span>
                          <span className="hidden group-open:inline">Tutup ▴</span>
                        </span>
                      </summary>
                      <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-sans text-xs leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {t.teks}
                      </pre>
                    </details>

                    <select
                      value={pemetaan[t.kunci] || ''}
                      onChange={(e) =>
                        setPemetaan((p) => {
                          const n = { ...p }
                          if (e.target.value) n[t.kunci] = e.target.value
                          else delete n[t.kunci]
                          return n
                        })
                      }
                      className="mt-3 w-full max-w-xs rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="">— abaikan —</option>
                      {preview.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              {Object.keys(pemetaan).length > 0 && (
                <button
                  onClick={() => kirim('preview')}
                  disabled={proses}
                  className="mt-3 rounded-lg bg-warning-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Terapkan {Object.keys(pemetaan).length} pemetaan
                </button>
              )}
            </div>
          )}

          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              Ringkasan per polsek ({Object.keys(preview.perUnit).length})
            </summary>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Polsek</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Hari aktif</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Rilis</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(preview.perUnit)
                    .sort((a, b) => b[1].baru - a[1].baru)
                    .map(([nama, v]) => (
                      <tr key={nama} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{nama}</td>
                        <td className="px-4 py-2 text-center text-gray-500">{v.hari}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-800 dark:text-white">{v.baru}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>

          <button
            onClick={() => kirim('simpan')}
            disabled={proses || preview.akanDisimpan === 0}
            className="mt-5 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {proses === 'simpan' ? 'Menyimpan…' : `Simpan ${preview.akanDisimpan} rilis`}
          </button>
          {preview.akanDisimpan === 0 && (
            <p className="mt-2 text-sm text-gray-500">Semua rilis di file ini sudah ada di database.</p>
          )}
        </div>
      )}
    </div>
  )
}