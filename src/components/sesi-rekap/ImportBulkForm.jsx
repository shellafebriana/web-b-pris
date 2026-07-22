"use client"

import { useState, useMemo, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { importBulkMediaOnlineAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import { detectPlatformIdWithFallback } from '@/lib/platform-detect'
import { preprocessRaw, parseWaLine, detectUnitFromSender, getArticleSlug, slugToTitle } from '@/lib/wa-paste-parser'

const initialState = { error: null }

export default function ImportBulkForm({ formats, platforms, units, existingSessionsMap }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [raw, setRaw] = useState('')
  const [formatId, setFormatId] = useState(formats[0]?.id || '')
  const [titleOverrides, setTitleOverrides] = useState({})

  const [state, formAction, isPending] = useActionState(importBulkMediaOnlineAction, initialState)

  useEffect(() => {
    if (state?.success) {
      const parts = []
      if (state.created > 0) parts.push(`${state.created} sesi baru dibuat`)
      if (state.appended > 0) parts.push(`${state.appended} sesi ditambahkan link-nya`)
      if (state.totalSkipped > 0) parts.push(`${state.totalSkipped} link duplikat dilewati`)
      showToast(parts.join(', '), 'success')
      router.push('/sesi-rekap')
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  const selectedFormat = formats.find((f) => f.id === formatId)
  const config = selectedFormat?.config || {}
  const requiresUnit = Boolean(config?.hasUnit)
  const existingSessions = existingSessionsMap[formatId] || []

  // Cocokkin judul grup ke sesi yang udah ada (case-insensitive)
  const findExistingSession = (title) => {
    const t = title?.trim().toLowerCase()
    if (!t) return null
    return existingSessions.find((s) => s.title?.trim().toLowerCase() === t) || null
  }

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
      } else if (line.startsWith('http')) {
        url = line
      } else {
        ignoredCount++
        continue
      }

      const slug = getArticleSlug(url)
      if (!slug) { ignoredCount++; continue }

      const platformId = detectPlatformIdWithFallback(url, platforms) || ''

      if (!groupMap.has(slug)) {
        groupMap.set(slug, { slug, autoTitle: slugToTitle(slug), links: [], unitNames: new Set() })
      }

      const group = groupMap.get(slug)
      group.links.push({ url, platformId, unitId: unitId || null })
      if (unitName) group.unitNames.add(unitName)
    }

    const groups = [...groupMap.values()].map((g) => ({
      ...g,
      title: titleOverrides[g.slug] ?? g.autoTitle,
      unitNames: [...g.unitNames].sort(),
    }))

    return { groups, ignoredCount }
  }, [raw, platforms, units, requiresUnit, titleOverrides])

  const { groups, ignoredCount } = grouped
  const totalLinks = groups.reduce((sum, g) => sum + g.links.length, 0)
  const missingPlatform = groups.some((g) => g.links.some((l) => !l.platformId))
  const canSubmit = groups.length > 0 && !missingPlatform && formatId && !isPending

  // Enriched groups buat preview — nambahin info "existing or new"
  const enrichedGroups = groups.map((g) => {
    const existing = findExistingSession(g.title)
    return { ...g, existingSession: existing }
  })

  const newCount = enrichedGroups.filter((g) => !g.existingSession).length
  const appendCount = enrichedGroups.filter((g) => g.existingSession).length

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
      <input type="hidden" name="groups" value={JSON.stringify(submitGroups)} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Kiri: Input ── */}
        <div className="flex w-1/2 flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="flex-1 overflow-y-auto p-5">
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
              Link otomatis dikelompokin per artikel (berdasarkan slug URL).
              {requiresUnit && ' Unit terdeteksi dari nama pengirim WhatsApp.'}
            </p>
            {ignoredCount > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {ignoredCount} baris diabaikan (gak ada URL valid)
              </p>
            )}
          </div>
        </div>

        {/* ── Kanan: Preview grup ── */}
        <div className="flex w-1/2 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {groups.length > 0 ? `${groups.length} artikel · ${totalLinks} link` : 'Preview'}
            </span>
            {groups.length > 0 && (
              <div className="flex gap-2 text-xs">
                {newCount > 0 && <span className="text-brand-600 dark:text-brand-400">{newCount} sesi baru</span>}
                {appendCount > 0 && <span className="text-success-600 dark:text-success-400">{appendCount} ditambahkan</span>}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {enrichedGroups.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-300 dark:text-gray-600">
                Paste chat WA di sebelah kiri...
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {enrichedGroups.map((group) => (
                  <div key={group.slug} className="p-4">
                    <div className="mb-2 flex items-start gap-2">
                      {group.existingSession ? (
                        <span className="mt-1 shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/20 dark:text-success-300">
                          + {group.links.length} link
                        </span>
                      ) : (
                        <span className="mt-1 shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                          {group.links.length} link
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
                      <p className="mb-2 text-xs text-success-600 dark:text-success-400">
                        ↳ Ditambahkan ke sesi yang udah ada ({group.existingSession.totalLinks} link sebelumnya)
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
                      {group.links.length > 3 && (
                        <p className="text-xs text-gray-400">+{group.links.length - 3} lainnya</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
          {isPending ? 'Memproses...' : groups.length > 0
            ? `Proses ${groups.length} artikel (${totalLinks} link)`
            : 'Proses'
          }
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