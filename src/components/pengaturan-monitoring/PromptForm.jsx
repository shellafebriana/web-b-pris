'use client'

import { useActionState, useEffect, useState } from 'react'
import { useToast } from '@/context/ToastProvider'
import { simpanPromptAction } from '@/app/(admin)/pengaturan-monitoring/prompt/actions'

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

export default function PromptForm({ teksAwal, diubahPadaAwal, maksKarakter, maksByte }) {
  const { showToast } = useToast()
  const [teks, setTeks] = useState(teksAwal)
  const [state, formAction, isPending] = useActionState(simpanPromptAction, null)

  // Efek samping (toast) di useEffect, bukan saat render.
  useEffect(() => {
    if (!state) return
    if (state.error) showToast(state.error, 'error')
    else if (state.sukses) showToast(state.sukses, 'success')
  }, [state, showToast])

  const panjang = teks.length
  const byte = encoder ? encoder.encode(teks).length : panjang
  const terlaluPanjang = panjang > maksKarakter || byte > maksByte
  const berubah = teks !== teksAwal
  const diubahPada = state?.diubahPada ?? diubahPadaAwal

  return (
    <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <label htmlFor="prompt" className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/90">
        Master prompt
      </label>
      <textarea
        id="prompt"
        name="prompt"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={22}
        spellCheck={false}
        placeholder="Tempel master prompt Patroli Digital di sini"
        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-xs ${terlaluPanjang ? 'text-error-600 dark:text-error-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {panjang.toLocaleString('id-ID')} dari {maksKarakter.toLocaleString('id-ID')} karakter
          {byte > maksByte ? ' · terlalu banyak simbol khusus' : ''}
          {diubahPada ? ` · terakhir diubah ${diubahPada}` : ' · belum pernah disimpan'}
        </p>
        <div className="flex gap-2">
          {berubah ? (
            <button
              type="button"
              onClick={() => setTeks(teksAwal)}
              disabled={isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batalkan perubahan
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </form>
  )
}