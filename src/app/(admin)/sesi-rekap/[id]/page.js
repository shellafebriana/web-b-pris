import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getRekapSessionById, filterPlatformsByFormat } from '@/lib/models/rekapSession'
import { getAllUnitsList } from '@/lib/models/unit'
import { getAllPlatformsList } from '@/lib/models/platform'
import SessionDetailView from '@/components/sesi-rekap/SessionDetailView'

export default async function DetailSesiRekapPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params

  const [session, units, platforms] = await Promise.all([
    getRekapSessionById(id),
    getAllUnitsList(),
    getAllPlatformsList(),
  ])

  if (!session) notFound()

  const allowedPlatforms = filterPlatformsByFormat(platforms, session.format?.config)
  const platformsRestricted = allowedPlatforms.length < platforms.length
  const requiresUnit = Boolean(session.format?.config?.hasUnit)

  return (
    <SessionDetailView
      session={session}
      platforms={platforms}
      allowedPlatforms={allowedPlatforms}
      platformsRestricted={platformsRestricted}
      units={units}
      requiresUnit={requiresUnit}
    />
  )
}