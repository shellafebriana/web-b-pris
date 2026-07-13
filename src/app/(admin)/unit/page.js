import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllUnitsList } from '@/lib/models/unit'
import UnitList from '@/components/unit/UnitList'

export default async function UnitPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  const units = await getAllUnitsList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Kelola Unit</h1>
         <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Daftar unit buat pengelompokan link amplifikasi
        </p>
      </div>

      <UnitList units={units} />
    </div>
  )
}