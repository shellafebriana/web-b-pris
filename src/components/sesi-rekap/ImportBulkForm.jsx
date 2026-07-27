"use client"

import { useState, useMemo, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { importBulkMediaOnlineAction, checkImportGroupsAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import { detectPlatformIdWithFallback, isPlatformAllowed, filterPlatformsByFormat } from '@/lib/platform-detect'
import { preprocessRaw, parseWaLine, detectUnitFromSender, getArticleSlug, slugToTitle } from '@/lib/wa-paste-parser'
import { normalizeUrl } from '@/lib/url-utils'

const initialState = { error: null }

export default function ImportBulkForm({ formats, platforms, units }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [raw, setRaw] = useState('')
  const [formatId, setFormatId] = useState(formats[0]?.id || '')
  const [dateRange, setDateRange] = useState('')
  const [titleOverrides, setTitleOverrides] = useState({})
  const [checkResults, setCheckResults] = useState({}) // title(lowercase) → hasil cek server

  const [state, formAction, isPending] = useActionState(importBulkMediaOnlineAction, initialState)

  useEffect(() => {
    if (state?.success) {
      const parts = []
      if (state.created > 0) parts.push(`${state.created} sesi baru dibuat`)
      if (state.appended > 0) parts.push(`${state.appended} sesi ditambahkan link-nya`)
      if (state.totalSkipped > 0) parts.push(`${state.totalSkipped} link duplikat dilewati`)
      if (state.totalInvalidPlatform > 0) parts.push(`${state.totalInvalidPlatform} link platform-nya gak sesuai dilewati`)
      if (state.totalInvalidUrl > 0) parts.push(`${state.totalInvalidUrl} URL gak valid dilewati`)
      if (state.failedCount > 0) parts.push(`${state.failedCount} gagal diproses`)
      showToast(parts.join(', ') || 'Selesai', state.failedCount > 0 ? 'error' : 'success')
      router.push('/sesi-rekap')
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  const selectedFormat = formats.find((f) => f.id === formatId)
  const config = selectedFormat?.config || {}
  const requiresUnit = Boolean(config?.hasUnit)
  const requiresDateRange = Boolean(config?.requiredFields?.includes('dateRange'))
  const allowedPlatforms = filterPlatformsByFormat(platforms, config)
  const platformsRestricted = allowedPlatforms.length < platforms.length

  const grouped = useMemo(() => {
    const preprocessed = preprocessRaw(raw)
    const lines = preprocessed.split('\n').map((l) => l.trim()).filter(Boolean)
    const groupMap = new Map()
    let ignoredCount = 0

    for (const line of lines) {
      let url = null
      let unitId = null
      let unitName = null

      const waResult = parseWaLine(line)
      if (waResult) {
        if (waResult.type === 'wa_no_url') { ignoredCount++; continue }
        url = waResult.url
        if (requiresUnit) {
          const senderUnit = detectUnitFromSender(waResult.sender, units)
          if (senderUnit) { unitId = senderUnit.id; unitName = senderUnit.name }
        }
      } else {
        const stripped = line.replace(/^\d+\.\s*/, '')
        if (!stripped.startsWith('http')) { ignoredCount++; continue }
        url = stripped
      }

      const slug = getArticleSlug(url)
      if (!slug) { ignoredCount++; continue }

      const detectedId = detectPlatformIdWithFallback(url, platforms) || ''
      const detectedPlatform = detectedId ? platforms.find((p) => p.id === detectedId) : null
      const allowed = detectedPlatform ? isPlatformAllowed(detectedPlatform.name, config) : false
      const platformId = allowed ? detectedId : ''

      if (!groupMap.has(slug)) {
        groupMap.set(slug, { slug, autoTitle: slugToTitle(slug), links: [], unitNames: new Set() })
      }
      const group = groupMap.get(slug)
      group.links.push({ url, platformId, unitId: unitId || null, _restricted: Boolean(detectedPlatform && !allowed) })
      if (unitName) group.unitNames.add(unitName)
    }

    const groups = [...groupMap.values()].map((g) => ({
      ...g,
      title: titleOverrides[g.slug] ?? g.autoTitle,
      unitNames: [...g.unitNames].sort(),
    }))
    return { groups, ignoredCount }
  }, [raw, platforms, units, requiresUnit, titleOverrides, config])

  const { groups, ignoredCount } = grouped

  // On-demand check: debounced, dipanggil ke server tiap daftar grup berubah.
  // Ganti dari "preload semua sesi+link format ini tiap buka halaman" jadi
  // "cek beneran cuma pas ada grup yang lagi di-preview"
  const checkDebounceRef = useRef(null)
  useEffect(() => {
    if (groups.length === 0 || !formatId) return
    clearTimeout(checkDebounceRef.current)
    checkDebounceRef.current = setTimeout(async () => {
      const summaries = groups.map((g) => ({ title: g.title, urls: g.links.map((l) => l.url) }))
      try {
        const results = await checkImportGroupsAction(formatId, summaries)
        const map = {}
        for (const r of results) {
          map[r.title?.trim().toLowerCase()] = r
        }
        setCheckResults(map)
      } catch {
        // gagal cek gak nge-block apa-apa — submit tetep divalidasi ulang di server
      }
    }, 500)
    return () => clearTimeout(checkDebounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, formatId, requiresUnit, JSON.stringify(titleOverrides)])

  const missingPlatform = groups.some((g) => g.links.some((l) => !l.platformId))
  const canSubmit =
    groups.length > 0 && !missingPlatform && formatId && (!requiresDateRange || dateRange.trim()) && !isPending

  function countNewAndDuplicate(links, existingUrls) {
    const seen = new Set(existingUrls || [])
    let newCount = 0
    let duplicateCount = 0
    for (const l of links) {
      const normalized = normalizeUrl(l.url)
      if (seen.has(normalized)) duplicateCount++
      else { seen.add(normalized); newCount++ }
    }
    return { newCount, duplicateCount }
  }

  const enrichedGroups = groups.map((g) => {
    const key = g.title?.trim().toLowerCase()
    const checkResult = checkResults[key]
    const restrictedCount = g.links.filter((l) => l._restricted).length
    const checking = Boolean(key) && !checkResult

    if (!checkResult?.exists) {
      return { ...g, existingSession: null, newCount: g.links.length, duplicateCount: 0, restrictedCount, checking }
    }
    const { newCount, duplicateCount } = countNewAndDuplicate(g.links, checkResult.existingUrls)
    return {
      ...g,
      existingSession: { totalLinks: checkResult.totalLinks },
      newCount,
      duplicateCount,
      restrictedCount,
      checking: false,
    }
  })

  const newSessionCount = enrichedGroups.filter((g) => !g.existingSession).length
  const appendSessionCount = enrichedGroups.filter((g) => g.existingSession).length
  const totalNewLinks = enrichedGroups.reduce((sum, g) => sum + g.newCount, 0)
  const totalDuplicateLinks = enrichedGroups.reduce((sum, g) => sum + g.duplicateCount, 0)
  const totalRestrictedLinks = enrichedGroups.reduce((sum, g) => sum + g.restrictedCount, 0)

  const handleTitleChange = (slug, newTitle) => {
    setTitleOverrides((prev) => ({ ...prev, [slug]: newTitle }))
  }

  const submitGroups = groups.map((g) => ({
    title: g.title,
    links: g.links.map(({ url, platformId, unitId }) => ({ url, platformId, unitId })),
  }))

  return (
    <form action={formAction} className="flex h-full flex-col">
      <input type="hidden" name="formatId" value={formatId} />
      <input type="hidden" name="dateRange" value={dateRange} />
      <input type="hidden" name="groups" value={JSON.stringify(submitGroups)} />

      <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="flex w-full flex-col border-b border-gray-200 dark:border-gray-800 md:w-1/2 md:border-b-0 md:border-r">
          <div className="p-5 md:flex-1 md:overflow-y-auto">
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              >
                {formats.length === 0 && <option value="">— tidak ada format media online —</option>}
                {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {requiresDateRange && (
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Periode tanggal <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  placeholder="Contoh: 21 Juli 2026"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-gray-400">Dipake buat semua sesi baru yang dibuat dari batch ini.</p>
              </div>
            )}

            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paste dari chat WhatsApp
            </label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={'[21/7 11.41] Bu Ayu Humas Polsek Giri: https://giri-news.lensabwi.com/hukum/artikel-satu...\n[21/7 11.54] Pak Hadi Humas Polsek Singojuruh: https://singojuruh-info.lensabwi.com/hukum/artikel-satu...\n[21/7 12.02] Bu Irma Humas Polsek Sempu: https://sempu-news.lensabwi.com/regional/artikel-dua...'}
              className="min-h-64 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Link otomatis dikelompokin per artikel. Kalau judul udah pernah ada, link baru bakal ditambahin ke sesi itu.
              {requiresUnit && ' Unit terdeteksi dari nama pengirim WhatsApp.'}
              {platformsRestricted && ' Platform dibatasi sesuai format yang dipilih.'}
            </p>
            {ignoredCount > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{ignoredCount} baris diabaikan</p>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col md:w-1/2">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {groups.length > 0 ? `${groups.length} artikel` : 'Preview'}
            </span>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {newSessionCount > 0 && <span className="text-brand-600 dark:text-brand-400">{newSessionCount} sesi baru</span>}
                {appendSessionCount > 0 && <span className="text-success-600 dark:text-success-400">{appendSessionCount} sesi ditambahin</span>}
                <span className="text-gray-400">·</span>
                <span className="text-success-600 dark:text-success-400">{totalNewLinks} link baru</span>
                {totalDuplicateLinks > 0 && <span className="text-amber-600 dark:text-amber-400">{totalDuplicateLinks} duplikat</span>}
                {totalRestrictedLinks > 0 && <span className="text-error-600 dark:text-error-400">{totalRestrictedLinks} platform gak sesuai</span>}
              </div>
            )}
          </div>
          <div className="md:flex-1 md:overflow-y-auto">
            {enrichedGroups.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-300 dark:text-gray-600">
                Paste chat WA di sebelah kiri...
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {enrichedGroups.map((group) => (
                  <div key={group.slug} className="p-4">
                    <div className="mb-2 flex flex-wrap items-start gap-2">
                      {group.checking ? (
                        <span className="mt-1 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-white/5">
                          mengecek...
                        </span>
                      ) : group.existingSession ? (
                        <span className="mt-1 shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/20 dark:text-success-300">
                          +{group.newCount} baru
                        </span>
                      ) : (
                        <span className="mt-1 shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                          {group.links.length} link
                        </span>
                      )}
                      {group.duplicateCount > 0 && (
                        <span className="mt-1 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          {group.duplicateCount} duplikat
                        </span>
                      )}
                      {group.restrictedCount > 0 && (
                        <span className="mt-1 shrink-0 rounded-full bg-error-100 px-2 py-0.5 text-xs font-medium text-error-700 dark:bg-error-500/20 dark:text-error-300">
                          {group.restrictedCount} platform gak sesuai
                        </span>
                      )}
                      <input
                        type="text"
                        value={group.title}
                        onChange={(e) => handleTitleChange(group.slug, e.target.value)}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-gray-800 outline-none hover:border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:text-white dark:hover:border-gray-700"
                      />
                    </div>
                    {group.existingSession && (
                      <p className="mb-2 text-xs text-gray-400">
                        ↳ Sesi udah ada, {group.existingSession.totalLinks} link sebelumnya
                      </p>
                    )}
                    {group.unitNames.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {group.unitNames.map((name) => (
                          <span key={name} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.links.slice(0, 3).map((link, i) => (
                        <p key={i} className="truncate text-xs font-mono text-gray-400">{link.url}</p>
                      ))}
                      {group.links.length > 3 && <p className="text-xs text-gray-400">+{group.links.length - 3} lainnya</p>}
                    </div>
                  </div>
                ))}
              </div>
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
          {isPending ? 'Memproses...' : groups.length > 0 ? `Proses ${groups.length} artikel (${totalNewLinks} link baru)` : 'Proses'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/sesi-rekap')}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Batal
        </button>
      </div>
    </form>
  )
}