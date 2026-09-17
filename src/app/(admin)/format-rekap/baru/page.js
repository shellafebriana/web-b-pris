import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllPlatformsList } from '@/lib/models/platform'
import TemplateEditor from '@/components/format-rekap/TemplateEditor'
import { getNextReportFormatId } from '@/lib/models/reportFormat'
import { getKategoriMonitoringList } from '@/lib/models/monitoring'

export default async function NewFormatRekapPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const [platforms, kategoriMonitoring, nextId] = await Promise.all([
    getAllPlatformsList(),
    getKategoriMonitoringList(),
    getNextReportFormatId(),
  ])

  return (
    <TemplateEditor
      mode="create"
      nextId={nextId}
      availablePlatforms={platforms.map((p) => ({ name: p.name, category: p.category }))}
      kategoriMonitoring={kategoriMonitoring}
    />
  )
}