'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createPriorityLink, updatePriorityLink, deletePriorityLink, reorderPriorityLinks } from '@/lib/models/priorityLink'

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return user
}

export async function createPriorityLinkAction(prevState, formData) {
  await requireAdmin()
  const keyword = formData.get('keyword')
  const description = formData.get('description')
  const isActive = formData.get('isActive') === 'on'

  try {
    await createPriorityLink({ keyword, description, isActive })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/link-prioritas')
  return { success: true }
}

export async function updatePriorityLinkAction(id, prevState, formData) {
  await requireAdmin()
  const keyword = formData.get('keyword')
  const description = formData.get('description')
  const isActive = formData.get('isActive') === 'on'

  try {
    await updatePriorityLink(id, { keyword, description, isActive })
  } catch (error) {
    return { error: error.message }
  }

  revalidatePath('/link-prioritas')
  return { success: true }
}

export async function deletePriorityLinkAction(id) {
  await requireAdmin()
  await deletePriorityLink(id)
  revalidatePath('/link-prioritas')
}

export async function reorderPriorityLinksAction(orderedIds) {
  await requireAdmin()
  await reorderPriorityLinks(orderedIds)
  revalidatePath('/link-prioritas')
}