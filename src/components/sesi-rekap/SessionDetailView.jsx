"use client"

import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/badge/Badge'
import { ChevronLeftIcon } from '@/icons'
import EditSessionInfoModal from './EditSessionInfoModal'
import SessionMetaCards from './SessionMetaCards'
import SessionLinksList from './SessionLinksList'
import GenerateReportPanel from './GenerateReportPanel'

const STATE_BADGE = {
  draft: { color: 'light', label: 'Draft' },
  active: { color: 'success', label: 'Active' },
  finished: { color: 'primary', label: 'Finished' },
}

export default function SessionDetailView({
  session,
  platforms,
  allowedPlatforms,
  platformsRestricted,
  units,
  requiresUnit,
}) {
  const router = useRouter()
  const badge = STATE_BADGE[session.state] || STATE_BADGE.draft

  return (
    <div className="fixed inset-0 z-999999 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── Topbar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/sesi-rekap')}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeftIcon className="size-4" /> Kembali
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {session.title || <span className="font-normal italic text-gray-400">— belum ada judul —</span>}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
              <Badge variant="light" color={badge.color}>{badge.label}</Badge>
              <span className="truncate">{session.format.name}</span>
              <span>·</span>
              <span className="truncate">{session.operatorWaId}</span>
              {session.dateRange && (
                <>
                  <span>·</span>
                  <span>{session.dateRange}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <EditSessionInfoModal session={session} />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-(--breakpoint-2xl)">
          <SessionMetaCards session={session} units={units} />

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SessionLinksList
              sessionId={session.id}
              links={session.links}
              platforms={platforms}
              allowedPlatforms={allowedPlatforms}
              platformsRestricted={platformsRestricted}
              units={units}
              requiresUnit={requiresUnit}
            />
            <GenerateReportPanel
              sessionId={session.id}
              initialText={session.summaryJson?.text}
              hasLinks={session.links.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  )
}