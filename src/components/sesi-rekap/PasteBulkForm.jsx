"use client"

import { useState, useMemo, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addLinksBulkAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import { detectPlatformIdWithFallback } from '@/lib/platform-detect'
import { preprocessRaw, parseWaLine, detectUnitFromSender, detectUnitFromText } from '@/lib/wa-paste-parser'
import { normalizeUrl } from '@/lib/url-utils'
import SearchableUnitSelect from './SearchableUnitSelect'

const initialState = { error: null }

export default function PasteBulkForm({
  sessionId,
  platforms,
  allowedPlatforms,
  platformsRestricted,
  units,
  requiresUnit,
  existingUrls = [],
}) {
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
    const preprocessed = preprocessRaw(raw)
    const lines = preprocessed.split('\n').map((l) => l.trim()).filter(Boolean)
    const items = []
    let currentUnitId = null
    let currentUnitName = null
    let ignoredCount = 0
    const seenUrls = new Set(existingUrls)

    for (const line of lines) {
      const waResult = parseWaLine(line)
      if (waResult) {
        // Cek isi pesan dulu (misal "*Glagah*") — menang duluan kalau ketemu.
        // Baru kalau isi pesannya gak nyebut unit apa pun, fallback ke tebak
        // dari nama pengirim. Ini WAJIB dicek di sini (sebelum wa_no_url
        // di-skip) — pesan tanpa link (operator nulis nama unit doang) tetep
        // harus ngupdate context unit buat link-link sesudahnya.
        if (requiresUnit) {
          const textForUnit = waResult.type === 'wa_url'
            ? waResult.content.replace(waResult.url, '').trim()
            : waResult.content
          const contentUnit = detectUnitFromText(textForUnit, units)
          if (contentUnit) {
            currentUnitId = contentUnit.id
            currentUnitName = contentUnit.name
          } else {
            const senderUnit = detectUnitFromSender(waResult.sender, units)
            if (senderUnit) {
              currentUnitId = senderUnit.id
              currentUnitName = senderUnit.name
            }
          }
        }

        if (waResult.type === 'wa_no_url') {
          ignoredCount++
          continue
        }

        const url = waResult.url
        const detectedId = detectPlatformIdWithFallback(url, platforms)
        const detectedPlatform = detectedId ? platforms.find((p) => p.id === detectedId) : null
        const detectedAllowed = detectedPlatform ? allowedPlatforms.some((p) => p.id === detectedPlatform.id) : true
        const platformId = detectedId && detectedAllowed ? detectedId : defaultPlatformId || ''
        const unitId = requiresUnit ? currentUnitId || defaultUnitId || '' : ''
        const normalized = normalizeUrl(url)
        const isDuplicate = seenUrls.has(normalized)
        if (!isDuplicate) seenUrls.add(normalized)
        items.push({
          url,
          platformId,
          unitId: unitId || null,
          _platformName: allowedPlatforms.find((p) => p.id === platformId)?.name || null,
          _unitName: requiresUnit ? (currentUnitName || null) : null,
          _conflictName: detectedPlatform && !detectedAllowed ? detectedPlatform.name : null,
          _isDuplicate: isDuplicate,
        })
        continue
      }

      const stripped = line.replace(/^\d+\.\s*/, '')
      if (!stripped.startsWith('http')) {
        if (requiresUnit) {
          const found = units.find((u) => u.name.toLowerCase() === stripped.toLowerCase())
          if (found) {
            currentUnitId = found.id
            currentUnitName = found.name
            continue
          }
        }
        ignoredCount++
        continue
      }

      const detectedId = detectPlatformIdWithFallback(stripped, platforms)
      const detectedPlatform = detectedId ? platforms.find((p) => p.id === detectedId) : null
      const detectedAllowed = detectedPlatform ? allowedPlatforms.some((p) => p.id === detectedPlatform.id) : true
      const platformId = detectedId && detectedAllowed ? detectedId : defaultPlatformId || ''
      const unitId = requiresUnit ? currentUnitId || defaultUnitId || '' : ''
      const normalized = normalizeUrl(stripped)
      const isDuplicate = seenUrls.has(normalized)
      if (!isDuplicate) seenUrls.add(normalized)
      items.push({
        url: stripped,
        platformId,
        unitId: unitId || null,
        _platformName: allowedPlatforms.find((p) => p.id === platformId)?.name || null,
        _unitName: requiresUnit ? (currentUnitName || null) : null,
        _conflictName: detectedPlatform && !detectedAllowed ? detectedPlatform.name : null,
        _isDuplicate: isDuplicate,
      })
    }
    return { items, ignoredCount }
  }, [raw, defaultPlatformId, defaultUnitId, units, platforms, allowedPlatforms, requiresUnit, existingUrls])

  const { items: parsedItems, ignoredCount } = parsed
  const missingPlatformCount = parsedItems.filter((i) => !i.platformId).length
  const conflictCount = parsedItems.filter((i) => i._conflictName).length
  const duplicateCount = parsedItems.filter((i) => i._isDuplicate).length
  const validItems = parsedItems.filter((i) => i.platformId)
  const canSubmit = validItems.length > 0 && !isPending

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
        value={JSON.stringify(validItems.map(({ _platformName, _unitName, _conflictName, _isDuplicate, ...item }) => item))}
      />

      <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="flex w-full flex-col border-b border-gray-200 dark:border-gray-800 md:w-1/2 md:border-b-0 md:border-r">
          <div className="p-5 md:flex-1 md:overflow-y-auto">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paste URL (satu baris satu link, atau langsung dari chat WhatsApp)
            </label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={
                requiresUnit
                  ? 'TANJUNGWANGI\nhttps://instagram.com/p/abc1\nhttps://facebook.com/abc1\n\natau langsung dari WhatsApp:\n[18.34, 21/7/2026] Humas Polsek Glenmore: https://...'
                  : 'https://instagram.com/p/abc1\nhttps://facebook.com/abc1\nhttps://x.com/abc2\n\natau langsung dari WhatsApp:\n[18.34, 21/7/2026] Operator: https://...'
              }
              className="min-h-48 w-full flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Platform otomatis terdeteksi dari domain URL (domain gak dikenal → Lainnya){platformsRestricted ? ', dibatasi sesuai format sesi ini' : ''}.
              {requiresUnit && ' Unit terdeteksi dari nama pengirim WhatsApp / isi pesan, atau tulis nama unit di barisnya sendiri.'}
            </p>
            {ignoredCount > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {ignoredCount} baris diabaikan (gak ada URL{requiresUnit ? ' atau nama unit yang dikenali' : ''})
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

        <div className="flex w-full flex-col md:w-1/2">
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
              {duplicateCount > 0 && (
                <span className="text-xs text-gray-400">{duplicateCount} duplikat</span>
              )}
            </div>
          </div>
          <div className="md:flex-1 md:overflow-y-auto">
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
                        : item._isDuplicate
                          ? 'opacity-50'
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
                  {item._isDuplicate && (
                    <span className="shrink-0 text-gray-400" title="Udah ada di sesi ini / ke-paste 2x">duplikat</span>
                  )}
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

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
        >
          {isPending
            ? 'Menyimpan...'
            : validItems.length > 0
              ? `Tambahkan (${validItems.length} link${missingPlatformCount > 0 ? `, ${missingPlatformCount} dilewati` : ''})`
              : 'Tambahkan'}
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