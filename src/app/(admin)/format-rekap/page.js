import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getAllReportFormatsList } from '@/lib/models/reportFormat'
import FormatRekapList from '@/components/format-rekap/FormatRekapList'

export default async function FormatRekapPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const formats = await getAllReportFormatsList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Format Rekap WhatsApp</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Template pesan balasan yang dikirim bot ke user
        </p>
      </div>

      <FormatRekapList formats={formats} />
    </div>
  )
}