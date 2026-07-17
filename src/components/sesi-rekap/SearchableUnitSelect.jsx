"use client"

import { useState, useEffect, useRef } from 'react'

export default function SearchableUnitSelect({ units, name, value, defaultValue = '', onChange, placeholder = '— tanpa unit —' }) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = isControlled ? value : internalValue

  const setValue = (v) => {
    if (!isControlled) setInternalValue(v)
    onChange?.(v)
  }

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = units.find((u) => u.id === currentValue)
  const filtered = units.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* hidden input cuma dirender kalau dipake langsung sebagai form field (ada `name`) */}
      {name && <input type="hidden" name={name} value={currentValue} />}
      <div
        onClick={() => { setOpen((v) => !v); setQuery('') }}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white"
      >
        <span className={selected ? '' : 'text-gray-400'}>{selected?.name || placeholder}</span>
        <span className="text-xs text-gray-400">▾</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari unit..."
              className="w-full bg-transparent px-2 py-1 text-sm text-gray-900 outline-none placeholder-gray-400 dark:text-white"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div
              onClick={() => { setValue(''); setOpen(false) }}
              className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {placeholder}
            </div>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs italic text-gray-400">Tidak ditemukan</p>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.id}
                  onClick={() => { setValue(u.id); setOpen(false) }}
                  className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    currentValue === u.id ? 'font-medium text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {u.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}