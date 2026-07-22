'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import {
  deleteRekapSession,
  updateRekapSessionInfo,
  addLinksToSession,
  updateLink,
  deleteLink,
  createRekapSession,
  generateReport,
  createBulkRekapSessions,
} from '@/lib/models/rekapSession'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }
  return user
}

export async function deleteRekapSessionAction(id) {
  await requireAdmin()
  await deleteRekapSession(id)
  revalidatePath('/sesi-rekap')
}

export async function updateRekapSessionInfoAction(id, prevState, formData) {
  await requireAdmin()
  const title = formData.get('title')
  const dateRange = formData.get('dateRange')

  try {
    await updateRekapSessionInfo(id, { title, dateRange })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath(`/sesi-rekap/${id}`)
  return { success: true }
}

export async function addLinkManualAction(sessionId, prevState, formData) {
  await requireAdmin()
  const url = formData.get('url')
  const platformId = formData.get('platformId')
  const unitId = formData.get('unitId')

  try {
    await addLinksToSession(sessionId, [{ url, platformId, unitId: unitId || null }])
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath(`/sesi-rekap/${sessionId}`)
  return { success: true }
}

export async function updateLinkAction(linkId, sessionId, prevState, formData) {
  await requireAdmin()
  const url = formData.get('url')
  const unitId = formData.get('unitId')

  try {
    await updateLink(linkId, { url, unitId: unitId || null })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath(`/sesi-rekap/${sessionId}`)
  return { success: true }
}

export async function deleteLinkAction(linkId, sessionId) {
  await requireAdmin()
  await deleteLink(linkId, sessionId)
  revalidatePath(`/sesi-rekap/${sessionId}`)
}

export async function createRekapSessionAction(prevState, formData) {
  await requireAdmin()

  const formatId = formData.get('formatId')
  const title = formData.get('title')
  const dateRange = formData.get('dateRange')

  let session
  try {
    session = await createRekapSession({ formatId, title, dateRange })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/sesi-rekap')
  redirect(`/sesi-rekap/${session.id}`)
}

export async function generateReportAction(sessionId) {
  await requireAdmin()
  try {
    const result = await generateReport(sessionId)
    revalidatePath(`/sesi-rekap/${sessionId}`)
    return { text: result.text }
  } catch (error) {
    return { error: error.message }
  }
}

export async function addLinksBulkAction(sessionId, prevState, formData) {
  await requireAdmin()

  let items
  try {
    items = JSON.parse(formData.get('items'))
  } catch {
    return { error: 'Data link tidak valid, coba paste ulang' }
  }

  let result
  try {
    result = await addLinksToSession(sessionId, items)
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath(`/sesi-rekap/${sessionId}`)
  return { success: true, added: result.added, duplicates: result.duplicates, conflicts: result.conflicts }
}

export async function importBulkMediaOnlineAction(prevState, formData) {
  await requireAdmin()

  const formatId = formData.get('formatId')
  let groups
  try {
    groups = JSON.parse(formData.get('groups'))
  } catch {
    return { error: 'Data tidak valid' }
  }

  try {
    const results = await createBulkRekapSessions(formatId, groups)
    revalidatePath('/sesi-rekap')
    const created = results.filter((r) => !r.isExisting)
    const appended = results.filter((r) => r.isExisting)
    const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0)

    return {
      success: true,
      count: results.length,
      created: created.length,
      appended: appended.length,
      totalSkipped,
    }
   } catch (error) {
    return { error: error.message }
  }
}
