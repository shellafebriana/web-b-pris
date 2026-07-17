import Link from 'next/link'
import Badge from '@/components/ui/badge/Badge'
import { ChevronLeftIcon } from '@/icons'
import EditSessionInfoModal from './EditSessionInfoModal'

const STATE_BADGE = {
  draft: { color: 'light', label: 'Draft' },
  active: { color: 'success', label: 'Active' },
  finished: { color: 'primary', label: 'Finished' },
}

export default function SessionHeader({ session }) {
  const badge = STATE_BADGE[session.state] || STATE_BADGE.draft

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <Link
        href="/sesi-rekap"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeftIcon className="size-4" />
        Kembali ke daftar sesi
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
          {session.title || <span className="font-normal italic text-gray-400">— belum ada judul —</span>}
        </h1>
        <EditSessionInfoModal session={session} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Badge variant="light" color={badge.color}>{badge.label}</Badge>
        <span>{session.format.name}</span>
        <span className="text-gray-300 dark:text-gray-600">&middot;</span>
        <span>{session.operatorWaId}</span>
        <span className="text-gray-300 dark:text-gray-600">&middot;</span>
        <span>
          {new Date(session.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        {session.dateRange && (
          <>
            <span className="text-gray-300 dark:text-gray-600">&middot;</span>
            <span>{session.dateRange}</span>
          </>
        )}
      </div>
    </div>
  )
}