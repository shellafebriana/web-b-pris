"use client"

import { useState, useMemo, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addLinksBulkAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import { detectPlatformId } from '@/lib/platform-detect'
import SearchableUnitSelect from './SearchableUnitSelect'

const initialState = { error: null }

export default function PasteBulkForm({ sessionId, platforms, allowedPlatforms, platformsRestricted, units, requiresUnit }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [raw, setRaw] = useState('')
  const [defaultPlatformId, setDefaultPlatformId] = useState('')
  const [defaultUnitId, setDefaultUnitId] = useState('')

  const action = addLinksBulkAction.bind(null, sessionId)
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      const parts = [`${state.added} link berhasil ditambahkan`]
      if (state.duplicates?.length > 0) parts.push(`${state.duplicates.length} duplikat dilewati`)
      if (state.conflicts?.length > 0) parts.push(`${state.conflicts.length} platform gak cocok dilewati`)
      showToast(parts.join(', '), 'success')
      router.push(`/sesi-rekap/${sessionId}`)
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  const parsed = useMemo(() => {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    const items = []
    let currentUnitId = null
    let currentUnitName = null
    let ignoredCount = 0

    for (const line of lines) {
      if (!line.startsWith('http')) {
        if (requiresUnit) {
          const found = units.find((u) => u.name.toLowerCase() === line.toLowerCase())
          if (found) {
            currentUnitId = found.id
            currentUnitName = found.name
            continue
          }
        }
        ignoredCount++
        continue
      }

      const detectedId = detectPlatformId(line, platforms)
      const detectedPlatform = detectedId ? platforms.find((p) => p.id === detectedId) : null
      const detectedAllowed = detectedPlatform ? allowedPlatforms.some((p) => p.id === detectedPlatform.id) : true

      const platformId = detectedId && detectedAllowed ? detectedId : defaultPlatformId || ''
      const unitId = requiresUnit ? currentUnitId || defaultUnitId || '' : ''

      items.push({
        url: line,
        platformId,
        unitId: unitId || null,
        _platformName: allowedPlatforms.find((p) => p.id === platformId)?.name || null,
        _unitName: requiresUnit ? currentUnitName : null,
        _conflictName: detectedPlatform && !detectedAllowed ? detectedPlatform.name : null,
      })
    }
    return { items, ignoredCount }
  }, [raw, defaultPlatformId, defaultUnitId, units, platforms, allowedPlatforms, requiresUnit])

  const { items: parsedItems, ignoredCount } = parsed
  const missingPlatformCount = parsedItems.filter((i) => !i.platformId).length
  const conflictCount = parsedItems.filter((i) => i._conflictName).length
  const canSubmit = parsedItems.length > 0 && missingPlatformCount === 0 && !isPending

  if (allowedPlatforms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-2xl border border-error-200 bg-error-50 p-5 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
          Format sesi ini gak punya platform valid — cek konfigurasi Format Rekap-nya dulu sebelum nambah link.
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex h-full flex-col">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(parsedItems.map(({ _platformName, _unitName, _conflictName, ...item }) => item))}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Kiri: Input ── */}
        <div className="flex w-1/2 flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paste URL (satu baris satu link)
            </label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={
                requiresUnit
                  ? 'TANJUNGWANGI\nhttps://instagram.com/p/abc1\nhttps://facebook.com/abc1\nSINGOJURUH\nhttps://instagram.com/p/abc2'
                  : 'https://instagram.com/p/abc1\nhttps://facebook.com/abc1\nhttps://x.com/abc2'
              }
              className="min-h-48 w-full flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Platform otomatis terdeteksi dari domain URL{platformsRestricted ? ', dibatasi sesuai format sesi ini' : ''}.
              {requiresUnit && ' Tulis nama unit di barisnya sendiri sebelum link-link unit tersebut.'}
            </p>
            {ignoredCount > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {ignoredCount} baris diabaikan (bukan URL{requiresUnit ? ' atau nama unit yang dikenali' : ''})
              </p>
            )}

            <div className={`mt-4 grid grid-cols-1 gap-4 ${requiresUnit ? 'lg:grid-cols-2' : ''}`}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default platform <span className="font-normal text-gray-400">(kalau gak kedeteksi)</span>
                </label>
                <select
                  value={defaultPlatformId}
                  onChange={(e) => setDefaultPlatformId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— tidak ada —</option>
                  {allowedPlatforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {requiresUnit && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default unit <span className="font-normal text-gray-400">(kalau gak ada header)</span>
                  </label>
                  <SearchableUnitSelect
                    units={units}
                    value={defaultUnitId}
                    onChange={setDefaultUnitId}
                    placeholder="— tidak ada —"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Kanan: Preview ── */}
        <div className="flex w-1/2 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {parsedItems.length > 0 ? `${parsedItems.length} URL terdeteksi` : 'Preview'}
            </span>
            <div className="flex gap-2">
              {missingPlatformCount > 0 && (
                <span className="text-xs text-error-600 dark:text-error-400">{missingPlatformCount} belum ada platform</span>
              )}
              {conflictCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">{conflictCount} platform gak cocok</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {parsedItems.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-300 dark:text-gray-600">
                Paste URL di sebelah kiri...
              </div>
            ) : (
              parsedItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-4 py-2 text-xs border-b border-gray-50 dark:border-gray-800 ${
                    !item.platformId
                      ? 'bg-error-50 dark:bg-error-500/10'
                      : item._conflictName
                        ? 'bg-amber-50 dark:bg-amber-500/10'
                        : ''
                  }`}
                >
                  {item._platformName ? (
                    <span className="shrink-0 rounded-full bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-gray-600 dark:text-gray-300">
                      {item._platformName}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-error-100 dark:bg-error-500/20 px-2 py-0.5 text-error-600 dark:text-error-400">
                      ?
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-gray-500 dark:text-gray-400">{item.url}</span>
                  {item._conflictName && (
                    <span className="shrink-0 text-amber-600 dark:text-amber-400" title={`Kedeteksi dari ${item._conflictName}`}>
                      ⚠ {item._conflictName}?
                    </span>
                  )}
                  {item._unitName && <span className="shrink-0 text-gray-300 dark:text-gray-600">{item._unitName}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
        >
          {isPending ? 'Menyimpan...' : `Tambahkan ${parsedItems.length > 0 ? `(${parsedItems.length} link)` : ''}`}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/sesi-rekap/${sessionId}`)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Batal
        </button>
      </div>
    </form>
  )
}