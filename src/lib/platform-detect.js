export function detectPlatformId(url, platforms) {
  let hostname
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  const match = platforms.find(
    (p) => Array.isArray(p.domain) && p.domain.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  )
  return match?.id ?? null
}

// Fallback ke "Lainnya" kalau URL valid tapi gak cocok domain manapun
export function detectPlatformIdWithFallback(url, platforms) {
  const detected = detectPlatformId(url, platforms)
  if (detected) return detected

  // Pastiin URL-nya valid dulu (bukan string random)
  try {
    new URL(url)
  } catch {
    return null
  }

  const lainnya = platforms.find((p) => p.name.toLowerCase() === 'lainnya')
  return lainnya?.id ?? null
}