// Helper MURNI — jangan import prisma/next di sini.
// Dipakai bareng page.js (preview) dan nanti route export, biar angka di layar
// dijamin sama dengan yang keluar di file.
//
// CATATAN: sengaja TIDAK pakai lib/date-helpers.js. Helper itu ngambil komponen
// tanggal pakai getter UTC tapi ngerakit ulang pakai `new Date(y, m, d)` yang
// jalan di timezone server — hasilnya geser 7 jam kalau server-nya UTC.

export const MODE_LIST = ['harian', 'bulanan', 'tahunan']

const WIB = '+07:00'
const TAHUN_MIN = 2020

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const pad = (n) => String(n).padStart(2, '0')

/** Bikin Date dari komponen tanggal WIB. Offset ditulis eksplisit di string. */
function wibDate(y, m, d) {
  return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00.000${WIB}`)
}

/** Komponen "hari ini" menurut WIB, bukan menurut timezone server. */
function hariIniWib() {
  const geser = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return {
    y: geser.getUTCFullYear(),
    m: geser.getUTCMonth() + 1,
    d: geser.getUTCDate(),
  }
}

/**
 * Validasi ketat searchParams -> rentang tanggal.
 * Input ngawur TIDAK diteruskan ke Prisma, tapi jatuh ke periode sekarang.
 */
export function parsePeriode(raw = {}) {
  const now = hariIniWib()
  const tahunMax = now.y + 1
  const validTahun = (y) => Number.isInteger(y) && y >= TAHUN_MIN && y <= tahunMax

  const mode = MODE_LIST.includes(raw.mode) ? raw.mode : 'bulanan'
  const nilai = typeof raw.periode === 'string' ? raw.periode.trim() : ''

  if (mode === 'harian') {
    const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nilai)
    let y = now.y, m = now.m, d = now.d
    if (cocok) {
      const [yy, mm, dd] = [+cocok[1], +cocok[2], +cocok[3]]
      if (validTahun(yy) && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        // tolak tanggal yang gak ada (2026-02-31 -> ke-normalisasi jadi Maret)
        const uji = new Date(wibDate(yy, mm, dd).getTime() + 7 * 3600 * 1000)
        if (uji.getUTCMonth() + 1 === mm && uji.getUTCDate() === dd) {
          y = yy; m = mm; d = dd
        }
      }
    }
    const start = wibDate(y, m, d)
    return {
      mode,
      periode: `${y}-${pad(m)}-${pad(d)}`,
      start,
      end: new Date(start.getTime() + 24 * 3600 * 1000),
      label: `${d} ${BULAN_ID[m - 1]} ${y}`,
      labelJudul: `TANGGAL ${d} ${BULAN_ID[m - 1].toUpperCase()} ${y}`,
    }
  }

  if (mode === 'tahunan') {
    const cocok = /^(\d{4})$/.exec(nilai)
    const y = cocok && validTahun(+cocok[1]) ? +cocok[1] : now.y
    return {
      mode,
      periode: String(y),
      start: wibDate(y, 1, 1),
      end: wibDate(y + 1, 1, 1),
      label: `Tahun ${y}`,
      labelJudul: `TAHUN ${y}`,
    }
  }

  // bulanan (default)
  const cocok = /^(\d{4})-(\d{2})$/.exec(nilai)
  let y = now.y, m = now.m
  if (cocok && validTahun(+cocok[1]) && +cocok[2] >= 1 && +cocok[2] <= 12) {
    y = +cocok[1]; m = +cocok[2]
  }
  return {
    mode,
    periode: `${y}-${pad(m)}`,
    start: wibDate(y, m, 1),
    end: m === 12 ? wibDate(y + 1, 1, 1) : wibDate(y, m + 1, 1),
    label: `${BULAN_ID[m - 1]} ${y}`,
    labelJudul: `BULAN ${BULAN_ID[m - 1].toUpperCase()} ${y}`,
  }
}

/** searchParams bisa string ATAU array (?format=a&format=b) */
export function keArray(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v) return [v]
  return []
}