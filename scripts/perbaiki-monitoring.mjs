import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import mammoth from 'mammoth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const WIB = '+07:00'
const tglWib = (s) => new Date(`${s}T00:00:00.000${WIB}`)
const teksPolos = (h) => String(h).replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/[\u200B-\u200F\uFEFF]/g, '').replace(/[\u00A0\u202F]/g, ' ')
  .replace(/\s+/g, ' ').trim()
const kunci = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const normUrl = (u) => String(u).trim().replace(/[.,;)\]]+$/, '').replace(/\/+$/, '')
const validUrl = (u) => { try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:' } catch { return false } }
const hashUrl = (u) => crypto.createHash('sha256').update(normUrl(u)).digest('hex')
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null } }

// Hanya melengkapi skema kalau polanya JELAS domain. Bukan menebak.
const RE_DOMAIN = /^(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s]*)?$/i
const lengkapiSkema = (t) => (RE_DOMAIN.test(t) ? `https://${t.replace(/^\/+/, '')}` : null)

function parseTanggalTabel(raw) {
  const t = teksPolos(raw).replace(/\s/g, '')
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!m) m = t.match(/^(\d{2})[/.-](\d{2})(\d{4})$/)
  if (!m) return null
  const d = Number(m[1]), mo = Number(m[2])
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null
  const p = (n) => String(n).padStart(2, '0')
  return `${m[3]}-${p(mo)}-${p(d)}`
}

const STOP = new Set('yang untuk dari dengan dalam pada akan telah sudah tidak juga saat usai hingga serta lebih masih agar bisa dapat tetap oleh atas para ini itu dan atau banyuwangi jatim jawa timur kabupaten kecamatan desa kembali jadi soal'.split(' '))
const tokenJudul = (s) => [...new Set(kunci(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w)))]
const jaccard = (a, b) => { const i = a.filter((x) => b.includes(x)).length; return i / (a.length + b.length - i) }

async function main() {
  const folder = process.argv[2]

  // ---------- 1. pulihkan URL tanpa skema (46 baris Juli) ----------
  if (folder) {
    const kategoriRows = await prisma.monitoringKategori.findMany()
    const petaKategori = new Map()
    for (const k of kategoriRows) {
      petaKategori.set(kunci(k.nama), k.id)
      for (const a of (Array.isArray(k.aliases) ? k.aliases : [])) petaKategori.set(kunci(a), k.id)
    }
    const idDefault = kategoriRows.find((k) => k.kode === 'SOSIAL_BUDAYA')?.id
    const platforms = await prisma.platform.findMany({ select: { id: true, domain: true, category: true } })
    const SOSMED = ['instagram.com','facebook.com','tiktok.com','twitter.com','x.com','youtube.com','threads.net']
    const kanalDariHost = (h) => {
      const p = platforms.find((x) => Array.isArray(x.domain) && x.domain.some((d) => h === d || h.endsWith(`.${d}`)))
      if (p) return { kanal: p.category === 'sosmed' ? 'SOSMED' : 'ONLINE', platformId: p.id }
      return { kanal: SOSMED.some((d) => h === d || h.endsWith(`.${d}`)) ? 'SOSMED' : 'ONLINE', platformId: null }
    }

    let pulih = 0, gagal = 0
    for (const f of fs.readdirSync(folder).filter((x) => x.toLowerCase().endsWith('.docx') && !x.startsWith('~$'))) {
      const { value: html } = await mammoth.convertToHtml({ buffer: fs.readFileSync(path.join(folder, f)) })
      let terakhir = null
      for (const tr of [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]) {
        const sel = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1])
        if (sel.length < 6) continue
        const [cNo, cTgl, , cKat, cJud, cUrl] = sel
        if (kunci(teksPolos(cTgl)) === 'tanggal' || kunci(teksPolos(cNo)) === 'no') continue
        const tanggal = parseTanggalTabel(cTgl) ?? terakhir
        if (!tanggal) continue
        terakhir = tanggal

        const href = (cUrl.match(/<a[^>]+href="([^"]+)"/i) || [])[1]
        const teks = teksPolos(cUrl)
        if (href || validUrl(teks)) continue          // sudah masuk waktu backfill
        const url = lengkapiSkema(teks)
        if (!url || !validUrl(url)) { gagal++; continue }

        const judul = teksPolos(cJud)
        const h = hostOf(url)
        if (!judul || !h) { gagal++; continue }

        const sesi = await prisma.monitoringSesi.findUnique({
          where: { contentDate: tglWib(tanggal) }, select: { id: true },
        })
        if (!sesi) { gagal++; continue }

        const { kanal, platformId } = kanalDariHost(h)
        try {
          await prisma.monitoringItem.create({
            data: {
              sesiId: sesi.id, kanal,
              kategoriId: petaKategori.get(kunci(teksPolos(cKat))) ?? idDefault,
              judul: judul.slice(0, 2000), url: normUrl(url), urlHash: hashUrl(url),
              sumber: h.slice(0, 120), platformId,
              sumberInput: 'IMPORT', isReviewed: true, urutan: 999,
            },
          })
          pulih++
        } catch (e) { if (e.code === 'P2002') gagal++; else throw e }
      }
    }
    console.log(`URL dipulihkan: ${pulih} | gagal: ${gagal}`)

    // sinkronkan ulang total sesi yang terpengaruh
    const grup = await prisma.monitoringItem.groupBy({ by: ['sesiId', 'kanal'], _count: { _all: true } })
    const peta = new Map()
    for (const g of grup) {
      const s = peta.get(g.sesiId) ?? { on: 0, so: 0 }
      if (g.kanal === 'ONLINE') s.on = g._count._all; else s.so = g._count._all
      peta.set(g.sesiId, s)
    }
    for (const [sesiId, s] of peta) {
      await prisma.monitoringSesi.update({ where: { id: sesiId }, data: { totalOnline: s.on, totalSosmed: s.so } })
    }
    console.log(`total sesi disinkronkan: ${peta.size}`)
  }

  // ---------- 2. tandai baris yang linknya dipakai judul lain ----------
  // Satu URL untuk beberapa judul berbeda = salah paste di dokumen sumber.
  const semuaItem = await prisma.monitoringItem.findMany({
    select: { id: true, urlHash: true, judul: true },
  })
  const judulPerUrl = new Map()
  for (const it of semuaItem) {
    const s = judulPerUrl.get(it.urlHash) ?? new Set()
    s.add(kunci(it.judul).slice(0, 60))
    judulPerUrl.set(it.urlHash, s)
  }
  const mencurigakan = semuaItem
    .filter((it) => (judulPerUrl.get(it.urlHash)?.size ?? 0) > 1)
    .map((it) => it.id)

  if (mencurigakan.length) {
    // chunk biar klausa IN tidak kepanjangan
    for (let i = 0; i < mencurigakan.length; i += 400) {
      await prisma.monitoringItem.updateMany({
        where: { id: { in: mencurigakan.slice(i, i + 400) } },
        data: { isReviewed: false, confidence: 0 },
      })
    }
  }
  console.log(`ditandai perlu review: ${mencurigakan.length} item`)

  // ---------- 3. bangun ulang klaster dari nol ----------
  const hapus = await prisma.monitoringIsu.deleteMany({})
  console.log(`isu lama dihapus: ${hapus.count}`)

  const ambangRow = await prisma.appConfig.findUnique({ where: { key: 'monitoring.ambang_klaster' } })
  const ambang = Number(ambangRow?.value) || 0.18

  const semua = await prisma.monitoringItem.findMany({
    select: { id: true, judul: true, kanal: true, kategoriId: true, sesi: { select: { contentDate: true } } },
  })
  const rows = semua.map((r) => ({
    id: r.id, judul: r.judul, kanal: r.kanal, kategoriId: r.kategoriId.toString(),
    tgl: r.sesi.contentDate.toISOString().slice(0, 10), tok: tokenJudul(r.judul),
  })).sort((a, b) => a.tgl.localeCompare(b.tgl))

  const dipakai = new Set()
  let nIsu = 0
  for (let a = 0; a < rows.length; a++) {
    if (dipakai.has(a)) continue
    const grup = [rows[a]]; dipakai.add(a)
    for (let b = a + 1; b < rows.length; b++) {
      if (dipakai.has(b)) continue
      if ((Date.parse(rows[b].tgl) - Date.parse(rows[a].tgl)) / 864e5 > 3) break
      if (jaccard(rows[a].tok, rows[b].tok) >= ambang) { grup.push(rows[b]); dipakai.add(b) }
    }
    if (grup.length < 2) continue

    const hitung = {}
    for (const g of grup) hitung[g.tgl] = (hitung[g.tgl] || 0) + 1
    const tglUrut = Object.keys(hitung).sort()
    const online = grup.filter((g) => g.kanal === 'ONLINE').length
    const sosmed = grup.length - online
    const nKategori = new Set(grup.map((g) => g.kategoriId)).size
    const skor = Math.round(grup.length * 4 + (online > 0 && sosmed > 0 ? 25 : 0)
      + (tglUrut.length - 1) * 10 + (nKategori > 1 ? 15 : 0))

    const isu = await prisma.monitoringIsu.create({
      data: {
        judul: grup[0].judul.slice(0, 2000), tokenJson: grup[0].tok,
        firstDate: tglWib(tglUrut[0]), lastDate: tglWib(tglUrut[tglUrut.length - 1]),
        totalItem: grup.length, totalOnline: online, totalSosmed: sosmed,
        kategoriCount: nKategori, hitungPerHari: hitung, skor,
      },
      select: { id: true },
    })
    await prisma.monitoringItem.updateMany({
      where: { id: { in: grup.map((g) => g.id) } }, data: { isuId: isu.id },
    })
    nIsu++
  }
  console.log(`isu dibangun ulang: ${nIsu}`)
}

main()
  .catch((e) => { console.error('\n', e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())