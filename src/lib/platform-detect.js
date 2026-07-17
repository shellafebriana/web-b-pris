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