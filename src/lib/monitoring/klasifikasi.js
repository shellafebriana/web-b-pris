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