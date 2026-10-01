const OFFSET_WIB = 7 * 60 * 60 * 1000

function komponen(date) {
  const g = new Date(date.getTime() + OFFSET_WIB)
  return { y: g.getUTCFullYear(), m: g.getUTCMonth(), d: g.getUTCDate() }
}

function wib(y, m, d, h = 0, mi = 0, s = 0, ms = 0) {
  return new Date(Date.UTC(y, m, d, h, mi, s, ms) - OFFSET_WIB)
}

export function getMonthRange(date = new Date()) {
  const { y, m } = komponen(date)
  return {
    startOfMonth: wib(y, m, 1),
    endOfMonth: wib(y, m + 1, 0, 23, 59, 59, 999),
    // Dipertahankan untuk pemanggil lama: getUTC*() dari nilai ini = komponen WIB
    indonesiaTime: new Date(date.getTime() + OFFSET_WIB),
  }
}

export function getDayRange(date = new Date()) {
  const { y, m, d } = komponen(date)
  return {
    startOfDay: wib(y, m, d),
    endOfDay: wib(y, m, d, 23, 59, 59, 999),
  }
}

export function tanggalWib(date) {
  const { y, m, d } = komponen(date)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}