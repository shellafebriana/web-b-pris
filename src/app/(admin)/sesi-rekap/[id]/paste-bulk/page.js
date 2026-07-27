import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { getRekapSessionById, filterPlatformsByFormat, getSessionExistingUrls } from '@/lib/models/rekapSession'
import { getAllPlatformsList } from '@/lib/models/platform'
import { getAllUnitsList } from '@/lib/models/unit'
import { ChevronLeftIcon } from '@/icons'
import PasteBulkForm from '@/components/sesi-rekap/PasteBulkForm'

export default async function PasteBulkPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params

  const [session, platforms, units, existingUrls] = await Promise.all([
    getRekapSessionById(id),
    getAllPlatformsList(),
    getAllUnitsList(),
    getSessionExistingUrls(id),
  ])

  if (!session) notFound()

  const allowedPlatforms = filterPlatformsByFormat(platforms, session.format?.config)
  const platformsRestricted = allowedPlatforms.length < platforms.length
  const requiresUnit = Boolean(session.format?.config?.hasUnit)

  return (
    <div className="fixed inset-0 z-999999 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/sesi-rekap/${id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeftIcon className="size-4" /> Kembali
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Paste Bulk URL</h1>
            <p className="truncate text-xs text-gray-400">{session.title || 'Sesi tanpa judul'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PasteBulkForm
          sessionId={session.id}
          platforms={platforms}
          allowedPlatforms={allowedPlatforms}
          platformsRestricted={platformsRestricted}
          units={units}
          requiresUnit={requiresUnit}
          existingUrls={existingUrls}
        />
      </div>
    </div>
  )
}