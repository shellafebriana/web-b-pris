'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

const LABEL_KATEGORI = { sosmed: 'Media Sosial', online: 'Media Online' }
const URUTAN_KATEGORI = ['sosmed', 'online']

function labelKategori(kode) {
  return LABEL_KATEGORI[kode] ?? 'Lainnya'
}

function peringkatKategori(kode) {
  const i = URUTAN_KATEGORI.indexOf(kode)
  return i === -1 ? URUTAN_KATEGORI.length : i
}

/**
 * Input tag platform. Hanya menerima nama dari master Platform.
 * options: [{ name, category }]
 * value:   string[] (nama platform, urutan sesuai pilihan)
 */
export default function PlatformTagInput({ options, value, onChange }) {
  const listId = useId()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [aktif, setAktif] = useState(0)

  const namaMaster = useMemo(() => new Set(options.map((o) => o.name)), [options])

  // Urutan tampilan = urutan navigasi keyboard: per kategori, lalu yang
  // diawali kata kunci lebih dulu, lalu alfabetis.
  const saran = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => !value.includes(o.name) && o.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const k = peringkatKategori(a.category) - peringkatKategori(b.category)
        if (k !== 0) return k
        if (q) {
          const sa = a.name.toLowerCase().startsWith(q) ? 0 : 1
          const sb = b.name.toLowerCase().startsWith(q) ? 0 : 1
          if (sa !== sb) return sa - sb
        }
        return a.name.localeCompare(b.name)
      })
  }, [options, value, query])

  const indeksAktif = saran.length ? Math.min(aktif, saran.length - 1) : -1
  const sorotan = indeksAktif >= 0 ? saran[indeksAktif] : null

  // Teks bayangan untuk pelengkapan otomatis (hanya kalau diawali kata kunci)
  const sisaBayangan =
    query && sorotan && sorotan.name.toLowerCase().startsWith(query.toLowerCase())
      ? sorotan.name.slice(query.length)
      : ''

  useEffect(() => {
    if (!open) return
    const tutup = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', tutup)
    return () => document.removeEventListener('mousedown', tutup)
  }, [open])

  const tambah = (nama) => {
    if (!value.includes(nama)) onChange([...value, nama])
    setQuery('')
    setAktif(0)
    inputRef.current?.focus()
  }

  const hapus = (nama) => onChange(value.filter((v) => v !== nama))

  const tambahKategori = (kode) => {
    const baru = options
      .filter((o) => o.category === kode && !value.includes(o.name))
      .map((o) => o.name)
    if (baru.length) onChange([...value, ...baru])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setAktif((i) => (saran.length ? (i + 1) % saran.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setAktif((i) => (saran.length ? (i - 1 + saran.length) % saran.length : 0))
    } else if (e.key === 'Enter') {
      // Selalu ditahan supaya Enter di sini tidak mengirim form editor
      e.preventDefault()
      if (open && sorotan) tambah(sorotan.name)
    } else if (e.key === 'Tab') {
      // Tab hanya memilih kalau sedang mengetik; kalau kosong, fokus pindah normal
      if (query.trim() && sorotan) {
        e.preventDefault()
        tambah(sorotan.name)
      }
    } else if (e.key === 'Backspace' && !query && value.length) {
      hapus(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const tidakTerdaftar = value.filter((v) => !namaMaster.has(v))
  const kategoriTersedia = URUTAN_KATEGORI.filter((k) => options.some((o) => o.category === k))

  let kategoriSebelumnya = null

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div ref={wrapRef} className="relative min-w-0 flex-1">
        <div
          className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 focus-within:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
          onClick={() => { inputRef.current?.focus(); setOpen(true) }}
        >
          {value.map((p) => {
            const valid = namaMaster.has(p)
            return (
              <span
                key={p}
                title={valid ? undefined : 'Platform tidak terdaftar di master Platform'}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                  valid
                    ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
                    : 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400'
                }`}
              >
                {p}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); hapus(p) }}
                  aria-label={`Hapus ${p}`}
                  className="leading-none opacity-70 hover:text-error-500 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            )
          })}

          <div className="relative min-w-28 flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden text-xs whitespace-pre"
            >
              <span className="invisible">{query}</span>
              <span className="text-gray-400 dark:text-gray-500">{sisaBayangan}</span>
            </span>
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="both"
              aria-activedescendant={open && sorotan ? `${listId}-${indeksAktif}` : undefined}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setAktif(0); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={value.length ? '' : 'Ketik nama platform...'}
              className="relative w-full bg-transparent p-0 text-xs text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {saran.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">
                {query ? 'Platform tidak ditemukan di master Platform' : 'Seluruh platform sudah dipilih'}
              </p>
            ) : (
              saran.map((o, i) => {
                const judul = o.category !== kategoriSebelumnya
                kategoriSebelumnya = o.category
                return (
                  <div key={o.name}>
                    {judul && (
                      <p className={`px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-gray-400 uppercase ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                        {labelKategori(o.category)}
                      </p>
                    )}
                    <button
                      id={`${listId}-${i}`}
                      type="button"
                      role="option"
                      aria-selected={i === indeksAktif}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setAktif(i)}
                      onClick={() => tambah(o.name)}
                      className={`block w-full px-3 py-1.5 text-left text-xs ${
                        i === indeksAktif
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {o.name}
                    </button>
                  </div>
                )
              })
            )}
            <p className="border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-400 dark:border-gray-700">
              Tab atau Enter untuk memilih · tombol panah untuk berpindah
            </p>
          </div>
        )}

        {tidakTerdaftar.length > 0 && (
          <p className="mt-1 text-[11px] text-error-600 dark:text-error-400">
            Hapus platform yang tidak terdaftar sebelum menyimpan.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 pt-1.5">
        {kategoriTersedia.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => tambahKategori(k)}
            className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400"
          >
            + Semua {labelKategori(k)}
          </button>
        ))}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full px-2 py-0.5 text-xs text-gray-400 hover:text-error-500"
          >
            Kosongkan
          </button>
        )}
      </div>
    </div>
  )
}