import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getMasterPrompt } from '@/lib/models/promptPatroli'
import { MAKS_KARAKTER_PROMPT, MAKS_BYTE_PROMPT } from '@/lib/monitoring/prompt-patroli'
import PromptForm from '@/components/pengaturan-monitoring/PromptForm'

export default async function PromptPatroliPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const { teks, diubahPada } = await getMasterPrompt()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">Prompt Patroli Digital</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Master prompt yang ditampilkan di halaman laporan monitoring untuk disalin ke ChatGPT.
          Daftar isu sebelumnya dan aturan keluaran ditambahkan otomatis saat prompt disalin,
          sehingga tidak perlu ditulis di sini.
        </p>
      </div>

      <PromptForm
        teksAwal={teks}
        diubahPadaAwal={diubahPada}
        maksKarakter={MAKS_KARAKTER_PROMPT}
        maksByte={MAKS_BYTE_PROMPT}
      />
    </div>
  )
}