"use client"

import { useState, useMemo } from 'react'
import { SearchIcon } from '@/icons'
import PlatformFormModal from './PlatformFormModal'
import DeletePlatformButton from './DeletePlatformButton'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'sosmed', label: 'Sosial Media' },
  { value: 'online', label: 'Media Online' },
]

const CATEGORY_BADGE = {
  sosmed: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  online: 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400',
}

export default function PlatformList({ platforms }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => {
    return platforms.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'all' || p.category === category
      return matchSearch && matchCategory
    })
  }, [platforms, search, category])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama platform..."
            className="w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === f.value
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
           <PlatformFormModal mode="create" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Kategori</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Total Link</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search
                    ? `Tidak ada platform yang cocok dengan "${search}"`
                    : 'Belum ada platform di kategori ini'}
                </td>
              </tr>
            ) : (
              filtered.map((platform, idx) => (
                <tr
                  key={platform.id}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {platform.name}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE[platform.category] || CATEGORY_BADGE.online}`}>
                      {platform.category === 'sosmed' ? 'Sosial Media' : 'Media Online'}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right text-sm ${platform.totalLinks === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                    {platform.totalLinks.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <PlatformFormModal mode="edit" platform={platform} />
                      <DeletePlatformButton id={platform.id} name={platform.name} />
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