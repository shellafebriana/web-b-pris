"use client"

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const fmtTanggal = (iso) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))

export default function ViralisasiSpripimList({ sessions, pagination }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const tanggal = searchParams.get('tanggal') || ''

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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center">
        <label htmlFor="filter-tanggal" className="shrink-0 text-sm text-gray-600 dark:text-gray-300">
          Tanggal
        </label>
        <input
          id="filter-tanggal"
          type="date"
          value={tanggal}
          onChange={(e) => updateParams({ tanggal: e.target.value, page: null })}
          onClick={(e) => {
            // Chrome cuma buka picker lewat ikon kalender kecil kalau gak dipaksa.
            // showPicker bisa throw di browser lama — diamkan, masih bisa diketik.
            try { e.currentTarget.showPicker() } catch {}
          }}
          disabled={isPending}
          style={{ colorScheme: 'light dark' }}
          className="w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-800 dark:text-white sm:max-w-52 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
        />
        {tanggal && (
          <button
            type="button"
            onClick={() => updateParams({ tanggal: null, page: null })}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300"
          >
            Semua tanggal
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Judul Sesi</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Tanggal</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Total Link</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {tanggal ? 'Gak ada sesi di tanggal ini' : 'Belum ada sesi Manajemen Media Sosial Kapolda'} 
                </td>
              </tr>
            ) : (
              sessions.map((session, idx) => (
                <tr
                  key={session.id}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <Link
                      href={`/laporan/viralisasi-spripim/${session.id}`}
                      className="font-medium hover:text-brand-500"
                    >
                      {session.judul}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {fmtTanggal(session.tanggal)}
                    {!session.pakaiContentDate && (
                      <span className="ml-1 text-xs text-gray-400" title="Sesi ini belum punya tanggal konten, dipakai tanggal dibuat">*</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
                    {session.totalLinks.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    <Link
                      href={`/laporan/viralisasi-spripim/${session.id}`}
                      className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300"
                    >
                      Buka
                    </Link>
                  </td>
                </tr>
              ))
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