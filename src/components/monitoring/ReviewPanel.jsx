'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastProvider'
import { ubahKategoriAction, tandaiReviewAction } from '@/app/(admin)/monitoring/actions'

export default function ReviewPanel({ data, kategori, pagination, bulan }) {
  const { showToast } = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pilihan, setPilihan] = useState(() => new Set())

  const semua = data.length > 0 && data.every((d) => pilihan.has(d.id))

  function toggle(id) {
    setPilihan((lama) => {
      const baru = new Set(lama)
      baru.has(id) ? baru.delete(id) : baru.add(id)
      return baru
    })
  }

  function ganti(item, kategoriId) {
    startTransition(async () => {
      const r = await ubahKategoriAction(item.id, kategoriId, item.sesiId)
      if (r?.error) return showToast(r.error, 'error')
      showToast('Kategori diperbarui', 'success')
      router.refresh()
    })
  }

  function tandaiBenar(ids) {
    startTransition(async () => {
      const r = await tandaiReviewAction(ids)
      if (r?.error) return showToast(r.error, 'error')
      showToast(`${ids.length} item ditandai sudah benar`, 'success')
      setPilihan(new Set())
      router.refresh()
    })
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tidak ada item yang perlu direview. Semua sudah dipastikan.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={semua}
            onChange={() => setPilihan(semua ? new Set() : new Set(data.map((d) => d.id)))}
            className="size-4 accent-brand-500"
          />
          Centang semua di halaman ini ({data.length})
        </label>

        {pilihan.size > 0 ? (
          <button
            type="button"
            onClick={() => tandaiBenar([...pilihan])}
            disabled={pending}
            className="ml-auto rounded-lg bg-success-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
          >
            Tandai {pilihan.size} sudah benar
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((d) => (
            <div key={d.id} className="flex gap-3 px-5 py-3.5">
              <input
                type="checkbox"
                checked={pilihan.has(d.id)}
                onChange={() => toggle(d.id)}
                aria-label={`Pilih ${d.judul}`}
                className="mt-1 size-4 flex-none accent-brand-500"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 dark:text-white/90">{d.judul}</p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                  <Link
                    href={`/monitoring/${d.sesiId}`}
                    className="text-gray-500 hover:underline dark:text-gray-400"
                  >
                    {d.tanggal}
                  </Link>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[200px] truncate text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {d.sumber ?? d.url}
                  </a>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      d.kanal === 'SOSMED'
                        ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400'
                        : 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15'
                    }`}
                  >
                    {d.kanal === 'SOSMED' ? 'Sosmed' : 'Online'}
                  </span>
                  {d.sesiFinal ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      sesi final
                    </span>
                  ) : null}

                  <select
                    value={d.kategoriId}
                    onChange={(e) => ganti(d, e.target.value)}
                    disabled={pending}
                    className="ml-auto rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {kategori.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.sortOrder}. {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pagination.totalPage > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Halaman {pagination.page} dari {pagination.totalPage}
            </span>
            <div className="flex gap-2">
              {pagination.page > 1 ? (
                <Link
                  href={`/monitoring/review?page=${pagination.page - 1}${bulan ? `&bulan=${bulan}` : ''}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-300"
                >
                  Sebelumnya
                </Link>
              ) : null}
              {pagination.page < pagination.totalPage ? (
                <Link
                  href={`/monitoring/review?page=${pagination.page + 1}${bulan ? `&bulan=${bulan}` : ''}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-300"
                >
                  Berikutnya
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}