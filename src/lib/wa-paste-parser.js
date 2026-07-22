// Regex buat format chat WhatsApp:
// [18.34, 21/7/2026] Nama: https://...
// [21/7 11.41] Nama: https://...
const WA_LINE_REGEX = /^\[[\d.,:\/ ]+\]\s*(.+?):\s*(.*)$/

// Pre-process: split pesan WA yang nempel tanpa newline
export function preprocessRaw(raw) {
  return raw.replace(/(\S)\[(\d)/g, '$1\n[$2')
}

// Parse 1 baris
export function parseWaLine(line) {
  const match = line.match(WA_LINE_REGEX)
  if (!match) return null

  const sender = match[1].trim()
  const content = match[2].trim()

  const urlMatch = content.match(/https?:\/\/\S+/)
  if (!urlMatch) return { type: 'wa_no_url', sender, content }

  return { type: 'wa_url', sender, url: urlMatch[0] }
}

// Deteksi unit dari nama pengirim WA
export function detectUnitFromSender(sender, units) {
  const senderLower = sender.toLowerCase()
  const sorted = [...units].sort((a, b) => b.name.length - a.name.length)
  return sorted.find((u) => senderLower.includes(u.name.toLowerCase())) || null
}

// ── Grouping buat Import Bulk Media Online ──

// Extract slug artikel dari URL (segment terakhir path, tanpa kategori)
// giri-news.lensabwi.com/hukum-kriminal/polres-pasuruan-kota-amankan.../
// → "polres-pasuruan-kota-amankan..."
export function getArticleSlug(url) {
  try {
    const { pathname } = new URL(url)
    const segments = pathname.split('/').filter(Boolean)
    return segments.length > 0 ? segments[segments.length - 1].toLowerCase() : ''
  } catch {
    return ''
  }
}

// Konversi slug jadi judul yang bisa dibaca
// "polres-pasuruan-kota-amankan-tersangka" → "Polres Pasuruan Kota Amankan Tersangka"
export function slugToTitle(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}