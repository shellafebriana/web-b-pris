import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllPlatformsList } from '@/lib/models/platform'
import TemplateEditor from '@/components/format-rekap/TemplateEditor'

export default async function NewFormatRekapPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const platforms = await getAllPlatformsList()

  return <TemplateEditor mode="create" availablePlatforms={platforms.map((p) => p.name)} />
}