// Penarik kandidat dari RSS. Tanpa dependensi tambahan — RSS itu XML
// sederhana, cukup diambil field yang dibutuhkan.

const UA = 'SIHUMAS-Monitor/1.0 (+Humas Polresta Banyuwangi)'
const BATAS_ITEM = 100
// Ambil id artikel dari URL Google News. Id ini stabil, jadi bisa di-cache.
export function googleIdDari(url) {
  return url.match(/\/(?:rss\/)?articles\/([^?/]+)/)?.[1] ?? null
}

// RSS media TIDAK punya filter kata kunci — feed memberi SEMUA artikel yang
// mereka terbitkan, termasuk berita Sidoarjo/Surabaya. Google News menyaring
// lewat query, RSS harus disaring di sini.
export const KEYWORD_BAWAAN = [
  'banyuwangi', 'blambangan', 'muncar', 'rogojampi', 'glenmore', 'wongsorejo',
  'kalipuro', 'tegaldlimo', 'singojuruh', 'srono', 'gambiran', 'bangorejo',
  'purwoharjo', 'pesanggaran', 'siliragung', 'cluring', 'tegalsari', 'kalibaru',
  'songgon', 'sempu', 'licin', 'glagah', 'kabat', 'ketapang', 'gandrung',
  'osing', 'using', 'ijen',
]

const normRelevansi = (s) =>
  ` ${String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()} `

// Cocokkan per kata utuh, bukan substring — 'licin' jangan kena 'lici'/'licinnya'
// dan 'giri' sengaja TIDAK dimasukkan karena terlalu umum.
export function relevanBanyuwangi(judul, url, keyword = KEYWORD_BAWAAN) {
  const teks = normRelevansi(`${judul} ${url ?? ''}`)
  return keyword.some((k) => teks.includes(` ${normRelevansi(k).trim()} `))
}


// Daerah lain yang sering muncul di feed jaringan media. Dipakai untuk sumber
// yang wajibKeyword-nya mati: kalau menyebut daerah lain TANPA menyebut
// Banyuwangi, hampir pasti bukan berita kita.
const DAERAH_LAIN = [
  'malang', 'blitar', 'surabaya', 'sidoarjo', 'jember', 'situbondo', 'bondowoso',
  'probolinggo', 'lumajang', 'kediri', 'madiun', 'jombang', 'mojokerto', 'gresik',
  'pasuruan', 'tuban', 'lamongan', 'bojonegoro', 'ngawi', 'magetan', 'ponorogo',
  'trenggalek', 'tulungagung', 'nganjuk', 'bangkalan', 'sampang', 'pamekasan', 'sumenep',
]

export function daerahLain(judul, url) {
  const teks = normRelevansi(`${judul} ${url ?? ''}`)
  if (teks.includes(' banyuwangi ')) return false
  return DAERAH_LAIN.some((d) => teks.includes(` ${d} `))
}


function ambilTag(blok, tag) {
  const m = blok.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return null
  return m[1]
    .trim()                                   // trim DULU — sebagian feed menaruh
    .replace(/<!\[CDATA\[/g, '')              // CDATA setelah baris baru, jadi
    .replace(/\]\]>/g, '')                    // jangkar ^ meleset
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')                 // sisa tag HTML di judul
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

const HOST_TERLARANG = ['google.com', 'googleusercontent.com', 'gstatic.com', 'ggpht.com']

function hostTerlarang(h) {
  return HOST_TERLARANG.some((d) => h === d || h.endsWith(`.${d}`))
}

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// Link Google News adalah pengalihan yang dijalankan lewat JavaScript, jadi
// mengikuti redirect biasa TIDAK berhasil (terbukti 0/5 saat diuji).
// Yang berhasil (5/5) adalah endpoint internal batchexecute: buka halaman
// artikel untuk ambil token ts+sg, lalu tukarkan token itu jadi URL asli.
//
// Ini endpoint tidak resmi dan bisa berubah sewaktu-waktu. Kalau nanti selalu
// gagal, cek dulu dengan scripts/uji-gnews.mjs sebelum menuduh crawler rusak.
export async function resolveUrl(url, urlCadangan, sourcePenerbit) {
  if (!/(^|\.)news\.google\.com$/i.test(safeHost(url))) return url

  const penerbit = sourcePenerbit ? safeHost(sourcePenerbit) : null
  const sah = (kandidat) => {
    if (!kandidat) return null
    const h = safeHost(kandidat)
    if (!h || hostTerlarang(h) || /news\.google\.com/i.test(h)) return null
    if (penerbit && h !== penerbit && !h.endsWith(`.${penerbit}`)) return null
    return kandidat
  }

  const dariDeskripsi = sah(urlCadangan)
  if (dariDeskripsi) return dariDeskripsi

  const id = url.match(/\/(?:rss\/)?articles\/([^?/]+)/)?.[1]
  if (!id) return null

  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 15000)
  try {
    const hal = await fetch(url, { signal: c.signal, headers: { 'user-agent': UA_BROWSER } })
    const html = await hal.text()
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
    if (!ts || !sg) return null

    const payload = JSON.stringify([[['Fbv4je',
      JSON.stringify(['garturlreq',
        [['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],
         'X','X',1,[1,1,1],1,1,null,0,0,null,0],
        id, Number(ts), sg]),
      null, 'generic']]])

    const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      signal: c.signal,
      headers: {
        'user-agent': UA_BROWSER,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: `f.req=${encodeURIComponent(payload)}`,
    })
    const teks = await r.text()
    const m = teks.match(/https?:\/\/(?!news\.google|www\.google)[^\s"'\\]{15,}/)
    return sah(m?.[0] ?? null)
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

export async function tarikSatuSumber(sumber, keyword = KEYWORD_BAWAAN) {
  const alamat = sumber.jenis === 'GNEWS' ? bangunUrlGnews(sumber.alamat) : sumber.alamat
  const { teks, gagal } = await ambilTeks(alamat)
  if (gagal) return { kandidat: [], status: `gagal: ${gagal}` }
  if (!/<rss|<feed|<rdf:RDF/i.test(teks)) return { kandidat: [], status: 'bukan feed RSS' }

  const mentah = parseRss(teks)
  const kandidat = []
  let dibuang = 0

  for (const m of mentah) {
    const urlUjiFilter = sumber.jenis === 'GNEWS' ? null : m.url

    if (sumber.wajibKeyword !== false) {
      if (!relevanBanyuwangi(m.judul, urlUjiFilter, keyword)) { dibuang++; continue }
    } else if (daerahLain(m.judul, urlUjiFilter)) {
      dibuang++
      continue
    }

    if (sumber.jenis === 'GNEWS') {
      // URL asli TIDAK diresolve di sini. Yang disimpan cukup judul + nama
      // penerbit; resolve dilakukan nanti hanya untuk yang benar-benar dipakai.
      const penerbit = m.sourcePenerbit ? safeHost(m.sourcePenerbit) : null
      if (!penerbit || hostTerlarang(penerbit)) { dibuang++; continue }
      kandidat.push({
        judul: bersihkanJudul(m.judul, penerbit).slice(0, 500),
        url: m.url,
        urlAsli: m.urlCadangan && safeHost(m.urlCadangan) === penerbit ? m.urlCadangan : null,
        googleId: googleIdDari(m.url),
        terbitAt: m.terbitAt,
        sumberNama: penerbit.slice(0, 120),
      })
      continue
    }

    let p
    try { p = new URL(m.url) } catch { continue }
    if (p.protocol !== 'http:' && p.protocol !== 'https:') continue
    const host = safeHost(m.url)
    if (!host || hostTerlarang(host)) continue

    kandidat.push({
      judul: bersihkanJudul(m.judul, host).slice(0, 500),
      url: m.url.replace(/\/+$/, ''),
      urlAsli: m.url.replace(/\/+$/, ''),   // RSS sudah URL asli
      googleId: null,
      terbitAt: m.terbitAt,
      sumberNama: host.slice(0, 120),
    })
  }

  const catatan = dibuang ? `, ${dibuang} tersaring` : ''
  return { kandidat, status: `ok: ${kandidat.length} item${catatan}` }
}