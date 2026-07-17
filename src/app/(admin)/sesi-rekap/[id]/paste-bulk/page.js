import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { getRekapSessionById, filterPlatformsByFormat  } from '@/lib/models/rekapSession'
import { getAllPlatformsList } from '@/lib/models/platform'
import { getAllUnitsList } from '@/lib/models/unit'
import PasteBulkForm from '@/components/sesi-rekap/PasteBulkForm'
import { ChevronLeftIcon } from '@/icons'

export default async function PasteBulkPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params

  const [session, platforms, units] = await Promise.all([
    getRekapSessionById(id),
    getAllPlatformsList(),
    getAllUnitsList(),
  ])

  if (!session) notFound()
  const allowedPlatforms = filterPlatformsByFormat(platforms, session.format?.config)
  const platformsRestricted = allowedPlatforms.length < platforms.length
  const requiresUnit = Boolean(session.format?.config?.hasUnit)

  return (
    <div>
      <Link
        href={`/sesi-rekap/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeftIcon className="size-4" />
        Kembali ke sesi
      </Link>
      <h1 className="text-title-sm font-bold text-gray-800 dark:text-white mb-1">Paste Bulk URL</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {session.title || 'Sesi tanpa judul'}
      </p>

      <PasteBulkForm sessionId={session.id} platforms={platforms} allowedPlatforms={allowedPlatforms} platformsRestricted={platformsRestricted} units={units} requiresUnit={requiresUnit}/>
    </div>
  )
}