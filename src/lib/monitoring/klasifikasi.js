// Mesin saran kategori berbasis rule. Cocokkan PERSIS per kata setelah
// dinormalisasi — bukan substring, karena 'sara' akan kena 'sarana'/'sarapan'.

export function normalisasi(teks) {
  return ` ${String(teks)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

// rules: [{ keyword, bobot, kategoriId, kanal }]
export function saranKategori(judul, sumber, rules, { kanal = null } = {}) {
  const teks = normalisasi(`${judul} ${sumber ?? ''}`)
  const skor = new Map()

  for (const r of rules) {
    if (r.kanal && kanal && r.kanal !== kanal) continue
    const kw = normalisasi(r.keyword).trim()
    if (!kw) continue
    if (teks.includes(` ${kw} `)) {
      const k = r.kategoriId.toString()
      skor.set(k, (skor.get(k) ?? 0) + r.bobot)
    }
  }

  if (skor.size === 0) return { kategoriId: null, confidence: 0 }

  const urut = [...skor.entries()].sort((a, b) => b[1] - a[1])
  const [kategoriId, nilai] = urut[0]
  const runnerUp = urut[1]?.[1] ?? 0
  const confidence = Math.min(95, Math.round(((nilai - runnerUp) / Math.max(nilai, 1)) * 60) + 35)

  return { kategoriId, confidence }
}

// Pisahkan tempelan bebas jadi pasangan judul + URL.
// Baris tanpa URL dianggap SAMBUNGAN judul baris berikutnya — judul panjang
// sering terpotong waktu disalin dari browser.
export function pisahJudulUrl(teks) {
  const bersih = String(teks)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, '')
    .replace(/[\u00A0\u202F\u2007]/g, ' ')

  const hasil = []
  let buf = []

  for (const baris of bersih.split('\n')) {
    const t = baris.trim()
    if (!t && buf.length === 0) continue
    buf.push(t)

    const gab = buf.join(' ')
    const semua = [...gab.matchAll(/https?:\/\/[^\s<>"']+/gi)]
    if (semua.length === 0) continue

    const cocok = semua[semua.length - 1][0]
    const url = cocok.replace(/[.,;)\]]+$/, '')
    // Penanda WA dibersihkan SETELAH URL dipotong — '_' di dalam URL
    // jangan ikut kehapus.
    const judul = gab
      .slice(0, gab.lastIndexOf(cocok))
      .replace(/^[*•\-\d.\s]+/, '')
      .replace(/[*_~`]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    hasil.push({ judul, url })
    buf = []
  }

  const sisa = buf.join(' ').trim()
  if (sisa) hasil.push({ judul: sisa.replace(/[*_~`]/g, '').trim(), url: null })

  return hasil
}