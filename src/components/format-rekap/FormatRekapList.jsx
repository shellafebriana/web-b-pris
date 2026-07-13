"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SearchIcon, PlusIcon } from '@/icons'
import DeleteFormatRekapButton from './DeleteFormatRekapButton'

const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

export default function FormatRekapList({ formats }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    return formats.filter((f) => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = status === 'all' || (status === 'active' ? f.isActive : !f.isActive)
      return matchSearch && matchStatus
    })
  }, [formats, search, status])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama format..."
            className="w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  status === f.value
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link
            href="/format-rekap/baru"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlusIcon className="size-4" />
            Tambah Format
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length === formats.length ? `${formats.length} format` : `${filtered.length} dari ${formats.length} format`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Deskripsi</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search || status !== 'all' ? 'Gak ada format yang cocok dengan filter ini' : 'Belum ada format'}
                </td>
              </tr>
            ) : (
              filtered.map((format, idx) => (
                <tr
                  key={format.id}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{format.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{format.description || '-'}</td>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        format.isActive
                          ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {format.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/format-rekap/${format.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                        Edit
                      </Link>
                      <DeleteFormatRekapButton id={format.id} name={format.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}