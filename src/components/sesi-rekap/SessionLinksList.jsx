"use client"

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LinkFormModal from './LinkFormModal'
import DeleteLinkButton from './DeleteLinkButton'

const PLATFORM_COLORS = {
  Instagram: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
  Facebook: 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400',
  TikTok: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
  YouTube: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
}
const DEFAULT_PLATFORM_COLOR = 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'

export default function SessionLinksList({
  sessionId,
  linksPage,
  linkPlatformOptions,
  platforms,
  allowedPlatforms,
  platformsRestricted,
  units,
  requiresUnit,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const currentPlatform = searchParams.get('platform') || ''
  const debounceRef = useRef(null)

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

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get('q') || '')) {
        updateParams({ q: search, page: null })
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const { data: links, pagination } = linksPage
  const showingFrom = links.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Daftar link ({pagination.total})
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/sesi-rekap/${sessionId}/paste-bulk`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + Paste Bulk
          </Link>
          <LinkFormModal
            mode="create"
            sessionId={sessionId}
            platforms={platforms}
            allowedPlatforms={allowedPlatforms}
            platformsRestricted={platformsRestricted}
            units={units}
            requiresUnit={requiresUnit}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari URL..."
          className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {['', ...linkPlatformOptions].map((p) => (
            <button
              key={p || 'all'}
              onClick={() => updateParams({ platform: p, page: null })}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                currentPlatform === p
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {p || 'Semua'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '50vh' }}>
        {links.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-300 dark:text-gray-600">
            {search || currentPlatform ? 'Gak ada link yang cocok' : 'Belum ada link'}
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 border-b border-gray-50 px-4 py-2.5 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              {link.isPriority ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Link prioritas" />
              ) : (
                <span className="w-1.5 shrink-0" />
              )}
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  PLATFORM_COLORS[link.platform?.name] || DEFAULT_PLATFORM_COLOR
                }`}
              >
                {link.platform?.name || 'Lainnya'}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-gray-500 dark:text-gray-400">{link.url}</span>
              {link.unit && <span className="shrink-0 text-gray-300 dark:text-gray-600">{link.unit.name}</span>}
              <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <LinkFormModal
                  mode="edit"
                  sessionId={sessionId}
                  link={link}
                  platforms={platforms}
                  allowedPlatforms={allowedPlatforms}
                  units={units}
                  requiresUnit={requiresUnit}
                />
                <DeleteLinkButton linkId={link.id} sessionId={sessionId} url={link.url} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <span className="text-xs text-gray-400">
          {pagination.total > 0
            ? `Nampilin ${showingFrom}-${showingTo} dari ${pagination.total}`
            : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Halaman {pagination.page} dari {pagination.pages}</span>
          <button
            onClick={() => updateParams({ page: String(pagination.page - 1) })}
            disabled={pagination.page <= 1 || isPending}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            ←
          </button>
          <button
            onClick={() => updateParams({ page: String(pagination.page + 1) })}
            disabled={pagination.page >= pagination.pages || isPending}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}