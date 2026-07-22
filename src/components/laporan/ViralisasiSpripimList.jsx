"use client"

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/badge/Badge'
import GeneratePptxButton from './GeneratePptxButton'

const STATE_BADGE = {
  draft: { color: 'light', label: 'Draft' },
  active: { color: 'success', label: 'Active' },
  finished: { color: 'primary', label: 'Finished' },
}

export default function ViralisasiSpripimList({ sessions, pagination }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debounceRef = useRef(null)

  const updateParams = (updates) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get('search') || '')) {
        updateParams({ search, page: null })
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul sesi..."
          className="w-full sm:max-w-xs rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Tanggal dibuat</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Total Link</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search ? 'Tidak ada sesi yang sesuai' : 'Belum ada sesi rekap format ini'}
                </td>
              </tr>
            ) : (
              sessions.map((session, idx) => {
                const badge = STATE_BADGE[session.state] || STATE_BADGE.draft
                return (
                  <tr
                    key={session.id}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(session.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td className="px-5 py-3 text-sm">
                      <Badge variant="light" color={badge.color}>{badge.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-800 dark:text-gray-200">
                      {session.totalLinks.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right text-sm">
                      <GeneratePptxButton sessionId={session.id} disabled={session.totalLinks === 0} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Halaman {pagination.page} dari {pagination.pages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => updateParams({ page: String(pagination.page - 1) })}
            disabled={pagination.page <= 1 || isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => updateParams({ page: String(pagination.page + 1) })}
            disabled={pagination.page >= pagination.pages || isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  )
}