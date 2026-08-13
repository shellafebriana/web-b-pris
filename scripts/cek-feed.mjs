const DOMAIN = [
  'banyuwangihits.id', 'seblang.com', 'bwi24jam.co.id', 'kabarbaik.co',
  'kabarbanyuwangi.co.id', 'timesindonesia.co.id', 'rubicnews.com',
  'radarbanyuwangi.jawapos.com', 'banyuwangikab.go.id', 'gempurnews.com',
  'bidiknasional.com', 'ketik.com', 'smnnews.co.id', 'cakrawarta.com',
]

const KANDIDAT = ['/feed/', '/rss/', '/feed/rss', '/rss.xml', '/index.php/feed/', '/?feed=rss2']

async function coba(url) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 8000)
  try {
    const r = await fetch(url, {
      signal: c.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'SIHUMAS-Monitor/1.0 (+humas Polresta Banyuwangi)' },
    })
    if (!r.ok) return null
    const teks = await r.text()
    if (!/<rss|<feed|<rdf:RDF/i.test(teks)) return null
    const n = (teks.match(/<item[\s>]|<entry[\s>]/gi) || []).length
    const judul = (teks.match(/<title>(?:<!\[CDATA\[)?([^<\]]{3,120})/i) || [])[1] || ''
    return { n, judul: judul.trim() }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// Fallback: baca <link rel="alternate" type="application/rss+xml"> dari homepage
async function temukanDariHtml(domain) {
  try {
    const r = await fetch(`https://${domain}/`, { headers: { 'user-agent': 'SIHUMAS-Monitor/1.0' } })
    const html = await r.text()
    const m = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i)
    if (!m) return null
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1]
    if (!href) return null
    return href.startsWith('http') ? href : new URL(href, `https://${domain}`).href
  } catch {
    return null
  }
}

const hasil = []
for (const d of DOMAIN) {
  let ketemu = null
  for (const p of KANDIDAT) {
    const url = `https://${d}${p}`
    const r = await coba(url)
    if (r) { ketemu = { url, ...r }; break }
  }
  if (!ketemu) {
    const auto = await temukanDariHtml(d)
    if (auto) {
      const r = await coba(auto)
      if (r) ketemu = { url: auto, ...r, via: 'autodiscovery' }
    }
  }
  hasil.push({ domain: d, ...(ketemu || { url: null }) })
  console.log(ketemu ? `OK    ${d.padEnd(30)} ${ketemu.n} item  ${ketemu.url}` : `GAGAL ${d}`)
}

console.log('\nhidup:', hasil.filter(h => h.url).length, 'dari', DOMAIN.length)
console.log(JSON.stringify(hasil.filter(h => h.url).map(h => ({ nama: h.judul, jenis: 'RSS', alamat: h.url, domain: h.domain })), null, 2))