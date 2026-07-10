"use client"

import { useState, useMemo } from 'react'
import { SearchIcon } from '@/icons'
import UnitFormModal from './UnitFormModal'
import DeleteUnitButton from './DeleteUnitButton'

const TYPE_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'POLRES', label: 'POLRES' },
  { value: 'SATFUNG', label: 'SATFUNG' },
  { value: 'POLSEK', label: 'POLSEK' },
]

export default function UnitList({ units }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')

  const filtered = useMemo(() => {
    return units.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
      const matchType = type === 'all' || u.type === type
      return matchSearch && matchType
    })
  }, [units, search, type])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama unit..."
            className="w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setType(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === f.value
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <UnitFormModal mode="create" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Type</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Total Link</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search || type !== 'all'
                    ? 'Tidak ada unit yang sesuai dengan filter ini'
                    : 'Belum ada unit'}
                </td>
              </tr>
            ) : (
              filtered.map((unit, idx) => (
                <tr
                  key={unit.id}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{unit.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{unit.type}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-800 dark:text-gray-200">
                    {unit.totalLinks.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <UnitFormModal mode="edit" unit={unit} />
                      <DeleteUnitButton id={unit.id} name={unit.name} />
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