import prisma from '@/lib/prisma'
import { MAKS_KARAKTER_PROMPT, MAKS_BYTE_PROMPT } from '@/lib/monitoring/prompt-patroli'

// Master prompt Patroli Digital disimpan di AppConfig (tabel yang sama dengan
// nama_kapolresta). Prefix "monitoring." + category "monitoring" mengikuti
// key monitoring lain yang sudah ada.
export const KUNCI_PROMPT_PATROLI = 'monitoring.prompt_patroli_digital'

const formatWaktu = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
})

function waktuWib(date) {
  return date ? `${formatWaktu.format(date)} WIB` : null
}

/** @returns {Promise<{ teks: string, diubahPada: string | null }>} */
export async function getMasterPrompt() {
  const row = await prisma.appConfig.findUnique({
    where: { key: KUNCI_PROMPT_PATROLI },
    select: { value: true, updatedAt: true },
  })
  return { teks: row?.value ?? '', diubahPada: waktuWib(row?.updatedAt ?? null) }
}

// Satu sumber kebenaran validasi — dipakai Server Action dan siapa pun yang
// menyimpan prompt.
export function bersihkanMasterPrompt(raw) {
  if (typeof raw !== 'string') throw new Error('Prompt tidak valid')
  const teks = raw.replace(/\r\n?/g, '\n').trim()
  if (!teks) throw new Error('Prompt wajib diisi')

  if (teks.length > MAKS_KARAKTER_PROMPT) {
    throw new Error(
      `Prompt maksimal ${MAKS_KARAKTER_PROMPT.toLocaleString('id-ID')} karakter ` +
      `(saat ini ${teks.length.toLocaleString('id-ID')} karakter)`
    )
  }
  if (Buffer.byteLength(teks, 'utf8') > MAKS_BYTE_PROMPT) {
    throw new Error(
      'Prompt terlalu panjang untuk disimpan karena banyak memakai simbol khusus. ' +
      'Silakan kurangi teks atau ganti simbol seperti "–" dan "•" dengan "-".'
    )
  }
  return teks
}

export async function simpanMasterPrompt(raw) {
  const teks = bersihkanMasterPrompt(raw)
  const row = await prisma.appConfig.upsert({
    where: { key: KUNCI_PROMPT_PATROLI },
    update: { value: teks },
    create: {
      key: KUNCI_PROMPT_PATROLI,
      value: teks,
      label: 'Master prompt Patroli Digital',
      category: 'monitoring',
    },
    select: { updatedAt: true },
  })
  return { diubahPada: waktuWib(row.updatedAt) }
}