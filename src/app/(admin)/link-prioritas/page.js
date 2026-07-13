import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllPriorityLinksList } from '@/lib/models/priorityLink'
import LinkPrioritasList from '@/components/link-prioritas/LinkPrioritasList'

export default async function LinkPrioritasPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const links = await getAllPriorityLinksList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Link Prioritas</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Daftar domain media yang diprioritaskan saat rekap link media online. Link prioritas akan muncul di bagian atas daftar link media online.
        </p>
      </div>

      <LinkPrioritasList links={links} />
    </div>
  )
}