import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getReportFormatById } from '@/lib/models/reportFormat'
import { getAllPlatformsList } from '@/lib/models/platform'
import TemplateEditor from '@/components/format-rekap/TemplateEditor'

export default async function EditFormatRekapPage({ params }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { id } = await params
  const [format, platforms] = await Promise.all([
    getReportFormatById(id),
    getAllPlatformsList(),
  ])

  if (!format) notFound()

  return <TemplateEditor mode="edit" initialData={format} availablePlatforms={platforms.map((p) => p.name)} />
}