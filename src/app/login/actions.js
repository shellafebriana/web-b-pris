'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Menghapus cookie login di server. Tanpa ini, menghapus localStorage saja
// tidak cukup: halaman admin membaca cookie, jadi sesi tetap aktif sampai
// cookie kedaluwarsa (24 jam).
export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}