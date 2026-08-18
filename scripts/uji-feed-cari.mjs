const DOMAIN = [
  'banyuwangihits.id', 'seblang.com', 'kabarbaik.co', 'gempurnews.com',
  'bidiknasional.com', 'smnnews.co.id', 'cakrawarta.com',
  'kabarbanyuwangi.co.id', 'bwi24jam.co.id', 'radarbanyuwangi.jawapos.com',
  'timesindonesia.co.id', 'rubicnews.com', 'ketik.com',
]
const POLA = ['/?s=banyuwangi&feed=rss2', '/search/banyuwangi/feed/', '/?s=banyuwangi&feed=atom']

const judulDari = (xml) =>
  [...xml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)]
    .map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
    .slice(1, 4)

for (const d of DOMAIN) {
  let ok = false
  for (const p of POLA) {
    const url = `https://${d}${p}`
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 10000)
    try {
      const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'SIHUMAS-Monitor/1.0' } })
      if (!r.ok) continue
      const teks = await r.text()
      if (!/<rss|<feed/i.test(teks)) continue
      const n = (teks.match(/<item[\s>]|<entry[\s>]/gi) || []).length
      if (n === 0) continue
      const contoh = judulDari(teks)
      const relevan = contoh.filter((j) => /banyuwangi|blambangan|ijen/i.test(j)).length
      console.log(`OK    ${d.padEnd(30)} ${String(n).padStart(3)} item  ${relevan}/${contoh.length} relevan`)
      console.log(`      ${url}`)
      contoh.forEach((j) => console.log(`        - ${j.slice(0, 70)}`))
      ok = true
      break
    } catch { /* lanjut pola berikutnya */ } finally { clearTimeout(t) }
  }
  if (!ok) console.log(`GAGAL ${d}`)
}