import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getRekapSessionById, filterPlatformsByFormat } from '@/lib/models/rekapSession'
import { getAllUnitsList } from '@/lib/models/unit'
import { getAllPlatformsList } from '@/lib/models/platform'
import SessionHeader from '@/components/sesi-rekap/SessionHeader'
import SessionMetaCards from '@/components/sesi-rekap/SessionMetaCards'
import SessionLinksList from '@/components/sesi-rekap/SessionLinksList'
import GenerateReportPanel from '@/components/sesi-rekap/GenerateReportPanel'

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

  const requiresUnit = Boolean(session.format?.config?.hasUnit)
  const allowedPlatforms = filterPlatformsByFormat(platforms, session.format?.config)
  const platformsRestricted = allowedPlatforms.length < platforms.length

  return (
    <div>
      <SessionHeader session={session} />
      <div className="mt-5">
        <SessionMetaCards session={session} units={units} />
      </div>
      <div className="mt-5">
        <SessionLinksList sessionId={session.id} links={session.links} platforms={platforms} allowedPlatforms={allowedPlatforms} platformsRestricted={platformsRestricted} units={units} requiresUnit={requiresUnit} />
      </div>
      <div className="mt-5">
        <GenerateReportPanel
          sessionId={session.id}
          initialText={session.summaryJson?.text}
          hasLinks={session.links.length > 0}
        />
      </div>
    </div>
  )
}