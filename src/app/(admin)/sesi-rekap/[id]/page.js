import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import {
  getRekapSessionById,
  filterPlatformsByFormat,
  getSessionMetaCounts,
  getSessionLinksPage,
  getSessionLinkPlatformIds,
} from '@/lib/models/rekapSession'
import { getAllUnitsList } from '@/lib/models/unit'
import { getAllPlatformsList } from '@/lib/models/platform'
import SessionDetailView from '@/components/sesi-rekap/SessionDetailView'

const LINKS_PER_PAGE = 50

export default async function DetailSesiRekapPage({ params, searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params
  const sp = await searchParams

  const [session, units, platforms] = await Promise.all([
    getRekapSessionById(id),
    getAllUnitsList(),
    getAllPlatformsList(),
  ])

  if (!session) notFound()

  const config = session.format?.config || {}
  const requiresUnit = Boolean(config.hasUnit)
  const allowedPlatforms = filterPlatformsByFormat(platforms, config)
  const platformsRestricted = allowedPlatforms.length < platforms.length

  const linkSearch = sp.q || ''
  const linkPlatform = sp.platform || ''
  const linkPage = Number(sp.page) || 1

  const [metaCounts, linksPage, usedPlatformIds] = await Promise.all([
    getSessionMetaCounts(id, config, units, platforms),
    getSessionLinksPage(id, {
      search: linkSearch,
      platform: linkPlatform,
      page: linkPage,
      limit: LINKS_PER_PAGE,
      sortByUnit: requiresUnit,
    }),
    getSessionLinkPlatformIds(id),
  ])

  const linkPlatformOptions = platforms
    .filter((p) => usedPlatformIds.includes(p.id))
    .map((p) => p.name)
    .sort()

  return (
    <SessionDetailView
      session={session}
      metaCounts={metaCounts}
      linksPage={linksPage}
      linkPlatformOptions={linkPlatformOptions}
      units={units}
      platforms={platforms}
      allowedPlatforms={allowedPlatforms}
      platformsRestricted={platformsRestricted}
      requiresUnit={requiresUnit}
    />
  )
}