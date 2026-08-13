// Penarik kandidat dari RSS. Tanpa dependensi tambahan — RSS itu XML
// sederhana, cukup diambil field yang dibutuhkan.

const UA = 'SIHUMAS-Monitor/1.0 (+Humas Polresta Banyuwangi)'
const BATAS_ITEM = 100

function ambilTag(blok, tag) {
  const m = blok.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return null
  return m[1]
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseRss(xml) {
  const blok = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((m) => m[0])

  const hasil = []
  for (const b of blok.slice(0, BATAS_ITEM)) {
    const judul = ambilTag(b, 'title')
    let url = ambilTag(b, 'link')
    if (!url) {
      const alt = b.match(/<link[^>]+href="([^"]+)"/i)
      url = alt?.[1] ?? null
    }
    const tanggal = ambilTag(b, 'pubDate') || ambilTag(b, 'published') || ambilTag(b, 'updated')
    // Google News menyelipkan URL asli di description
    const deskripsi = ambilTag(b, 'description') ?? ''
    const dariDeskripsi = deskripsi.match(/href="(https?:\/\/(?!news\.google\.)[^"]+)"/i)?.[1] ?? null

    // Google News menyertakan domain penerbit di <source url="...">.
    // Dipakai untuk MEMVALIDASI hasil resolusi, bukan sekadar menebak.
    const src = b.match(/<source[^>]+url="([^"]+)"/i)?.[1] ?? null
    if (!judul || !url) continue
    const terbit = tanggal ? new Date(tanggal) : null
    hasil.push({
      judul,
      url,
      urlCadangan: dariDeskripsi,
      sourcePenerbit: src,
      terbitAt: terbit && !Number.isNaN(terbit.getTime()) ? terbit : null,
    })
  }
  return hasil
}

async function ambilTeks(url, timeoutMs = 12000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: c.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    })
    if (!r.ok) return { gagal: `HTTP ${r.status}` }
    return { teks: await r.text(), urlAkhir: r.url }
  } catch (e) {
    return { gagal: e.name === 'AbortError' ? 'timeout' : e.message }
  } finally {
    clearTimeout(t)
  }
}

// Aset/CDN — bukan artikel. Kalau resolusi mendarat di sini, itu salah.
const HOST_TERLARANG = [
  'googleusercontent.com', 'gstatic.com', 'ggpht.com',
  'google.com', 'news.google.com', 'accounts.google.com', 'policies.google.com',
]

function hostTerlarang(h) {
  return HOST_TERLARANG.some((d) => h === d || h.endsWith(`.${d}`))
}

// Link Google News adalah pengalihan yang dijalankan lewat JavaScript, jadi
// tidak selalu bisa diselesaikan dari server. Kalau tidak bisa dipastikan,
// kandidatnya DIBUANG — lebih baik kehilangan satu berita daripada menyimpan
// URL gambar/aset yang salah.
export async function resolveUrl(url, urlCadangan, sourcePenerbit) {
  const hostAsal = safeHost(url)
  if (!/(^|\.)news\.google\.com$/i.test(hostAsal)) return url

  const hostPenerbit = sourcePenerbit ? safeHost(sourcePenerbit) : null

  const cocok = (kandidat) => {
    if (!kandidat) return null
    const h = safeHost(kandidat)
    if (!h || hostTerlarang(h)) return null
    // Kalau penerbitnya diketahui, hasil resolusi WAJIB dari domain itu.
    if (hostPenerbit && h !== hostPenerbit && !h.endsWith(`.${hostPenerbit}`)) return null
    return kandidat
  }

  const dariCadangan = cocok(urlCadangan)
  if (dariCadangan) return dariCadangan

  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 10000)
  try {
    const r = await fetch(url, {
      signal: c.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'accept-language': 'id-ID,id;q=0.9',
      },
    })

    const dariRedirect = cocok(r.url)
    if (dariRedirect) return dariRedirect

    const html = await r.text()
    for (const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
      const hasil = cocok(m[0])
      if (hasil) return hasil
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export function safeHost(u) {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' }
}

// Judul Google News berakhiran " - Nama Media", harus dipotong.
export function bersihkanJudul(judul, host) {
  const potong = judul.replace(/\s+[-–|]\s+[^-–|]{2,40}$/u, '').trim()
  return potong.length >= 15 ? potong : judul.trim()
}

export function bangunUrlGnews(query) {
  const q = encodeURIComponent(`${query} when:1d`)
  return `https://news.google.com/rss/search?q=${q}&hl=id&gl=ID&ceid=ID:id`
}

export async function tarikSatuSumber(sumber) {
  const alamat = sumber.jenis === 'GNEWS' ? bangunUrlGnews(sumber.alamat) : sumber.alamat
  const { teks, gagal } = await ambilTeks(alamat)
  if (gagal) return { kandidat: [], status: `gagal: ${gagal}` }
  if (!/<rss|<feed|<rdf:RDF/i.test(teks)) return { kandidat: [], status: 'bukan feed RSS' }

  const mentah = parseRss(teks)
  const kandidat = []
  for (const m of mentah) {
    const url = sumber.jenis === 'GNEWS'
      ? await resolveUrl(m.url, m.urlCadangan, m.sourcePenerbit)
      : m.url
    if (!url) continue
    let p
    try { p = new URL(url) } catch { continue }
    if (p.protocol !== 'http:' && p.protocol !== 'https:') continue
    const host = safeHost(url)
    if (!host || hostTerlarang(host)) continue
    kandidat.push({
      judul: bersihkanJudul(m.judul, host).slice(0, 500),
      url: url.replace(/\/+$/, ''),
      terbitAt: m.terbitAt,
      sumberNama: host.slice(0, 120),
    })
  }
  return { kandidat, status: `ok: ${kandidat.length} item` }
}