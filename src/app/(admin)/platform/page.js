import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllPlatformsList } from '@/lib/models/platform'
import PlatformList from '@/components/platform/PlatformList'

export default async function PlatformPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  const platforms = await getAllPlatformsList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
          Kelola Platform
        </h1>
         <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {platforms.length} platform terdaftar
        </p>
      </div>

      <PlatformList platforms={platforms} />
    </div>
  )
}