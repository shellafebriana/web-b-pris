"use client"

import { useState } from 'react'
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

export default function SessionLinksList({ sessionId, links, platforms, allowedPlatforms, platformsRestricted, units, requiresUnit }) {
  const [filterPlatform, setFilterPlatform] = useState('all')

  const uniquePlatforms = [...new Set(links.map((l) => l.platform?.name).filter(Boolean))]
  const filtered = links.filter((l) => filterPlatform === 'all' || l.platform?.name === filterPlatform)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Daftar link ({filtered.length}{filterPlatform !== 'all' ? ` dari ${links.length}` : ''})
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {['all', ...uniquePlatforms].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  filterPlatform === p
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                {p === 'all' ? 'Semua' : p}
              </button>
            ))}
          </div>
          <Link
            href={`/sesi-rekap/${sessionId}/paste-bulk`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + Paste Bulk
          </Link>
          <LinkFormModal mode="create" sessionId={sessionId} platforms={platforms}platformsRestricted={platformsRestricted} units={units} requiresUnit={requiresUnit} />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-300 dark:text-gray-600">Belum ada link</div>
        ) : (
          filtered.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 border-b border-gray-50 px-4 py-2.5 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              {link.isPriority ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Link prioritas" />
              ) : (
                <span className="w-1.5 shrink-0" />
              )}
              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_COLORS[link.platform?.name] || DEFAULT_PLATFORM_COLOR}`}>
                {link.platform?.name || 'Lainnya'}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-gray-500 dark:text-gray-400">{link.url}</span>
              {link.unit && <span className="shrink-0 text-gray-300 dark:text-gray-600">{link.unit.name}</span>}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <LinkFormModal mode="edit" sessionId={sessionId} link={link} platforms={platforms} allowedPlatforms={allowedPlatforms} units={units} requiresUnit={requiresUnit} />
                <DeleteLinkButton linkId={link.id} sessionId={sessionId} url={link.url} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}