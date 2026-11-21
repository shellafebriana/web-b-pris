// Fungsi murni (tanpa Prisma) untuk menyusun teks prompt Patroli Digital
// yang disalin admin ke ChatGPT. Dipisah dari Model supaya bisa diuji tanpa
// database.
//
// Susunan teks yang disalin:
//   1. master prompt (diisi admin di Pengaturan Monitoring → Prompt)
//   2. tanggal monitoring + daftar isu beberapa hari sebelumnya
//   3. ATURAN_KELUARAN — ditulis tetap di kode, TIDAK bisa diubah dari web,
//      karena pembaca hasil tempelan (Temuan Isu) bergantung pada aturan ini.

// AppConfig.value bertipe TEXT di MySQL: maksimal 65.535 byte. Batas karakter
// untuk pesan yang mudah dipahami, batas byte untuk pengaman sebenarnya
// (huruf khusus seperti "–" atau "•" memakan lebih dari 1 byte).
export const MAKS_KARAKTER_PROMPT = 60000
export const MAKS_BYTE_PROMPT = 65000

export const ATURAN_KELUARAN = [
  'ATURAN KELUARAN (WAJIB, AGAR HASIL DAPAT DIBACA SISTEM B-PRIS):',
  '1. Setiap isu diawali baris judul tersendiri dengan format *<ANGKA ROMAWI>. <JUDUL ISU>*, contoh: *I. KONVOI SUPORTER FUTSAL DI KECAMATAN KABAT*.',
  '2. Nama subbagian pada setiap isu ditulis persis: LINK MEDIA ONLINE, LINK MEDIA SOSIAL, ISI PEMBERITAAN DAN ANALISA, RENCANA TINDAK LANJUT. Huruf urutannya (A, B, C, D) boleh bergeser apabila ada subbagian yang NIHIL.',
  '3. Setiap link ditulis utuh pada barisnya sendiri, persis seperti pada file TXT. Jangan memendekkan link, mengubah link, menambahkan parameter, atau memberi format tebal pada link.',
  '4. Jangan mencantumkan link yang tidak terdapat pada file TXT, kecuali link dari laporan Polsek/Satfung yang saya berikan secara langsung.',
  '5. Bagian kesimpulan diberi judul persis: KESIMPULAN ANALISA. Bagian penutup diberi judul persis: PENUTUP.',
  '6. Jangan menambahkan kalimat pembuka atau penutup di luar format laporan, misalnya "Berikut laporannya".',
].join('\n')

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// 'YYYY-MM-DD' -> 'Kamis, 19 November 2026'. Dirakit di UTC supaya tidak
// bergantung zona waktu server.
export function labelTanggalIndo(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso))
  if (!m) return String(iso)
  const [y, bln, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const hari = HARI[new Date(Date.UTC(y, bln - 1, d)).getUTCDay()]
  return `${hari}, ${d} ${BULAN[bln - 1]} ${y}`
}

// Judul isu dari data monitoring bisa berisi baris baru; dijadikan satu baris
// supaya daftar tetap rapi.
function satuBaris(teks, maks = 200) {
  const t = String(teks ?? '').replace(/\s+/g, ' ').trim()
  return t.length > maks ? `${t.slice(0, maks - 1).trimEnd()}…` : t
}

/**
 * @param {{ master: string, tanggal: string, isuSebelumnya?: {tanggal: string, judul: string}[], hariIsu?: number }} p
 */
export function susunPromptPatroli({ master, tanggal, isuSebelumnya = [], hariIsu = 3 }) {
  const isu = Array.isArray(isuSebelumnya) ? isuSebelumnya.filter((i) => i && i.judul) : []
  const baris = [
    String(master ?? '').trim(),
    '',
    '---',
    `TANGGAL MONITORING LAPORAN INI: ${labelTanggalIndo(tanggal)}`,
    '',
    `ISU YANG MUNCUL PADA ${hariIsu} HARI SEBELUMNYA (BAHAN PERBANDINGAN UNTUK DEDUPLIKASI ISU):`,
    ...(isu.length
      ? isu.map((i) => `- ${labelTanggalIndo(i.tanggal)}: ${satuBaris(i.judul)}`)
      : ['- Tidak ada data isu pada hari-hari tersebut.']),
    '',
    ATURAN_KELUARAN,
  ]
  return baris.join('\n')
}