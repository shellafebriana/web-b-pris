/**
 * Deteksi unit dari domain URL. Dipilih ketimbang tebak dari nama pengirim karena
 * pemetaannya pasti (24 domain : 24 polsek, nol tabrakan), sedangkan nama pengirim
 * punya ~55 variasi dan sering diteruskan admin atas nama polsek lain.
 */
export function detectUnitIdByUrl(url, units) {
  let hostname
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
  const match = units.find(
    (u) =>
      Array.isArray(u.domains) &&
      u.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  )
  return match?.id ?? null
}