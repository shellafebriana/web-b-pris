export function normalizeUrl(url) {
  return url.trim().replace(/\/+$/, '')
}