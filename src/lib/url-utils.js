export function normalizeUrl(url) {
  return url.trim().replace(/\/+$/, '')
}

// Validasi server-side — client udah nyoba `new URL(url)` juga, tapi itu
// gampang di-bypass kalau ada yang manggil Server Action langsung (DevTools,
// API tools) tanpa lewat form kita. Ini jaring pengaman terakhir.
export function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}