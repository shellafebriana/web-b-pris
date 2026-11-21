'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { simpanMasterPrompt } from '@/lib/models/promptPatroli'

export async function simpanPromptAction(prevState, formData) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  try {
    const { diubahPada } = await simpanMasterPrompt(formData.get('prompt'))
    revalidatePath('/pengaturan-monitoring/prompt')
    // Halaman laporan sesi membaca prompt saat dibuka (dinamis), jadi tidak
    // perlu revalidate per sesi.
    return { sukses: 'Prompt disimpan', diubahPada, waktu: Date.now() }
  } catch (error) {
    return { error: error.message, waktu: Date.now() }
  }
}