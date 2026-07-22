import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { getAllReportFormatsList } from '@/lib/models/reportFormat'
import { getAllPlatformsList } from '@/lib/models/platform'
import { getAllUnitsList } from '@/lib/models/unit'
import { ChevronLeftIcon } from '@/icons'
import ImportBulkForm from '@/components/sesi-rekap/ImportBulkForm'
import { getExistingSessionTitles } from '@/lib/models/rekapSession'

export default async function ImportBulkPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const [formats, platforms, units] = await Promise.all([
    getAllReportFormatsList(),
    getAllPlatformsList(),
    getAllUnitsList(),
  ])

  // Filter format yang namanya mengandung "media online" (case-insensitive)
  const onlineFormats = formats.filter(
    (f) => f.isActive && f.name.toLowerCase().includes('media online')
  )

  const existingSessionsMap = {}
  for (const f of onlineFormats) {
    existingSessionsMap[f.id] = await getExistingSessionTitles(f.id)
  }

  return (
    <div className="fixed inset-0 z-999999 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Link
            href="/sesi-rekap"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeftIcon className="size-4" /> Kembali
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Import Bulk Media Online</h1>
            <p className="text-xs text-gray-400">Paste dari chat WhatsApp, otomatis dikelompokin per artikel</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ImportBulkForm formats={onlineFormats} platforms={platforms} units={units} existingSessionsMap={existingSessionsMap}  />
      </div>
    </div>
  )
}