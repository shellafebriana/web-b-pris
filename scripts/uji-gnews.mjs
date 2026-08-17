// Penguji resolusi link Google News. TIDAK menyentuh database.
// Tujuannya cuma satu: cari tahu strategi mana yang berhasil di jaringan ini.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const QUERY = process.argv[2] || 'banyuwangi'
const JUMLAH_UJI = Number(process.argv[3]) || 5

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const terlarang = (h) => ['google.com','googleusercontent.com','gstatic.com','ggpht.com']
  .some((d) => h === d || h.endsWith(`.${d}`))

function tag(blok, nama) {
  const m = blok.match(new RegExp(`<${nama}[^>]*>([\\s\\S]*?)</${nama}>`, 'i'))
  return m ? m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() : null
}

// --- Strategi A: ID artikel di-base64, format lama menyimpan URL di dalamnya
function strategiA(url) {
  const id = url.match(/\/(?:rss\/)?articles\/([^?/]+)/)?.[1]
  if (!id) return null
  try {
    const buf = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const teks = buf.toString('utf8')
    const m = teks.match(/https?:\/\/[^\s\x00-\x1f"']{10,}/)
    if (!m) return null
    const bersih = m[0].replace(/[^\x20-\x7e]+.*$/, '')
    return terlarang(host(bersih)) ? null : bersih
  } catch { return null }
}

// --- Strategi B: endpoint batchexecute (perlu ts + signature dari halaman)
async function strategiB(url) {
  const id = url.match(/\/(?:rss\/)?articles\/([^?/]+)/)?.[1]
  if (!id) return null
  try {
    const hal = await fetch(url, { headers: { 'user-agent': UA } })
    const html = await hal.text()
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
    if (!ts || !sg) return null

    const payload = JSON.stringify([[['Fbv4je',
      JSON.stringify(['garturlreq', [['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],'X','X',1,[1,1,1],1,1,null,0,0,null,0], id, Number(ts), sg]),
      null, 'generic']]])

    const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `f.req=${encodeURIComponent(payload)}`,
    })
    const teks = await r.text()
    const m = teks.match(/https?:\/\/(?!news\.google|www\.google)[^\s"'\\]{10,}/)
    return m && !terlarang(host(m[0])) ? m[0] : null
  } catch { return null }
}

// --- Strategi C: ikuti pengalihan, cocokkan dengan domain penerbit
async function strategiC(url, penerbit) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } })
    if (r.url && !/news\.google\.com/.test(r.url) && !terlarang(host(r.url))) return r.url
    const html = await r.text()
    for (const m of html.matchAll(/https?:\/\/[^\s"'<>\\]{15,}/g)) {
      const h = host(m[0])
      if (!h || terlarang(h) || /news\.google\.com/.test(h)) continue
      if (penerbit && h !== penerbit && !h.endsWith(`.${penerbit}`)) continue
      return m[0]
    }
    return null
  } catch { return null }
}

const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(`${QUERY} when:1d`)}&hl=id&gl=ID&ceid=ID:id`
console.log('Menarik feed:', feed, '\n')

const res = await fetch(feed, { headers: { 'user-agent': UA } })
if (!res.ok) { console.log('GAGAL ambil feed:', res.status); process.exit(1) }
const xml = await res.text()
const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0])
console.log(`item di feed: ${items.length}, diuji: ${Math.min(JUMLAH_UJI, items.length)}\n`)

const skor = { A: 0, B: 0, C: 0 }
for (const b of items.slice(0, JUMLAH_UJI)) {
  const judul = (tag(b, 'title') || '').slice(0, 55)
  const link = tag(b, 'link')
  const penerbit = host(b.match(/<source[^>]+url="([^"]+)"/i)?.[1] ?? '')
  console.log(`• ${judul}`)
  console.log(`  penerbit menurut feed: ${penerbit || '(tidak ada)'}`)

  const a = strategiA(link)
  console.log(`  A base64      : ${a ? a.slice(0, 75) : 'gagal'}`)
  if (a) skor.A++

  const bb = await strategiB(link)
  console.log(`  B batchexecute: ${bb ? bb.slice(0, 75) : 'gagal'}`)
  if (bb) skor.B++

  const c = await strategiC(link, penerbit)
  console.log(`  C redirect    : ${c ? c.slice(0, 75) : 'gagal'}`)
  if (c) skor.C++
  console.log()
}

console.log('=== SKOR ===')
for (const [k, v] of Object.entries(skor)) console.log(`  strategi ${k}: ${v}/${Math.min(JUMLAH_UJI, items.length)} berhasil`)