import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getUnitDetail } from '@/lib/models/unit'
import UnitDetailView from '@/components/unit/UnitDetailView'

export default async function DetailUnitPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params
  const unit = await getUnitDetail(id)
  if (!unit) notFound()

  return <UnitDetailView unit={unit} />
}