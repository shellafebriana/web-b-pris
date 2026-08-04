// Satu sumber warna buat tabel di layar, PNG, dan Excel — biar tiga-tiganya seragam.
export const WARNA = {
  headerBg: '#1449b0',
  headerText: '#ffffff',
  top3: '#d9f2e4',
  bottom3: '#fbdedc',
  baris: '#ffffff',
  garis: '#e4e7ec',
  teks: '#1d2939',
  teksMuted: '#667085',
  footerBg: '#f2f4f7',
}

/** Versi tanpa '#' buat exceljs (ARGB, wajib 8 digit). */
export const argb = (hex) => 'FF' + hex.replace('#', '').toUpperCase()

export const JUDUL_1 = 'POLRESTA BANYUWANGI'
export const JUDUL_2 = 'KEAKTIFAN VIRALISASI KONTEN MEDIA SOSIAL'

/** Penanda baris hijau/merah. Dipakai bareng PNG & Excel biar gak beda aturan. */
export function tandaBaris(index, jumlahBaris, total) {
  if (index < 3 && total > 0) return 'top'
  if (jumlahBaris > 6 && index >= jumlahBaris - 3) return 'bottom'
  return null
}