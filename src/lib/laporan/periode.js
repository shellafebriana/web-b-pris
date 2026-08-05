// Helper MURNI — jangan import prisma/next di sini.
// Dipakai bareng page.js (preview) dan route export, biar angka di layar
// dijamin sama dengan yang keluar di file.
//
// TIDAK pakai lib/date-helpers.js: helper itu ngambil komponen tanggal pakai
// getter UTC tapi ngerakit ulang pakai `new Date(y, m, d)` yang jalan di timezone
// server — hasilnya geser 7 jam kalau server-nya UTC.

export const MODE_LIST = ['harian', 'bulanan', 'tahunan']

const WIB = '+07:00'
const TAHUN_MIN = 2020

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI']

const pad = (n) => String(n).padStart(2, '0')

function wibDate(y, m, d) {
  return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00.000${WIB}`)
}

function hariIniWib() {
  const geser = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return { y: geser.getUTCFullYear(), m: geser.getUTCMonth() + 1, d: geser.getUTCDate() }
}

export function komponenWib(date) {
  const g = new Date(date.getTime() + 7 * 3600 * 1000)
  return { y: g.getUTCFullYear(), m: g.getUTCMonth() + 1, d: g.getUTCDate() }
}

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

/**
 * Minggu dimulai hari SENIN. Jumlah bucket per bulan BUKAN selalu 5 —
 * bisa 4 (Feb 2027), 5, atau 6 (Agustus 2026). Kalau dipatok, satu minggu
 * penuh hilang tanpa error apa pun.
 */
function infoMinggu(y, m) {
  const hariAkhir = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const hariPertama = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 0=Minggu
  const offset = (hariPertama + 6) % 7 // 0=Senin
  const jumlah = Math.ceil((hariAkhir + offset) / 7)
  return { hariAkhir, offset, jumlah }
}

/**
 * Kolom periode adaptif:
 *   harian  -> 1 kolom JUMLAH
 *   bulanan -> MINGGU I..VI (Senin-an, jumlah ikut kalender)
 *   tahunan -> JAN..DES
 */
export function buildBuckets(periode) {
  if (periode.mode === 'harian') {
    return [{ key: 'total', label: 'JUMLAH', subLabel: null }]
  }
  if (periode.mode === 'tahunan') {
    return BULAN_ID.map((b, i) => ({
      key: `b${i + 1}`,
      label: b.slice(0, 3).toUpperCase(),
      subLabel: null,
    }))
  }
  const [y, m] = periode.periode.split('-').map(Number)
  const { hariAkhir, offset, jumlah } = infoMinggu(y, m)
  const namaBulan = BULAN_ID[m - 1]

  return Array.from({ length: jumlah }, (_, i) => {
    const dari = Math.max(1, i * 7 + 1 - offset)
    const sampai = Math.min(hariAkhir, (i + 1) * 7 - offset)
    return {
      key: `m${i + 1}`,
      label: `MINGGU ${ROMAWI[i]}`,
      subLabel: `${dari}-${sampai} ${namaBulan}`,
    }
  })
}

/** Tanggal efektif sesi -> key bucket. */
export function bucketKey(date, periode) {
  if (periode.mode === 'harian') return 'total'
  const { y, m, d } = komponenWib(date)
  if (periode.mode === 'tahunan') return `b${m}`
  const { offset } = infoMinggu(y, m)
  return `m${Math.floor((d + offset - 1) / 7) + 1}`
}

/** searchParams bisa string ATAU array (?format=a&format=b) */
export function keArray(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v) return [v]
  return []
}