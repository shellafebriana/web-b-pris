import pptxgen from 'pptxgenjs'
import path from 'path'

const PAGE_W_IN = 8.2677 // A4 lebar
const PAGE_H_IN = 11.6929 // A4 tinggi
const NAVY = '1F3864'
const WHITE = 'FFFFFF'
const YELLOW = 'FFFF00'
const LINK_COLOR = '0563C1'

const ASSET_DIR = path.join(process.cwd(), 'public/laporan-assets')
const COVER_BG = path.join(ASSET_DIR, 'cover-bg.png')
const LOGO_1 = path.join(ASSET_DIR, 'logo-1.png')
const LOGO_2 = path.join(ASSET_DIR, 'logo-2.png')

function addHeaderBar(slide, text, y) {
  slide.addShape('rect', { x: 0, y, w: PAGE_W_IN, h: 0.6, fill: { color: NAVY } })
  slide.addText(text, {
    x: 0, y, w: PAGE_W_IN, h: 0.6,
    fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Carlito',
  })
}

// Logo cuma ada di slide Lampiran & Link Postingan (bukan di slide Stats - sesuai file asli)
function addSlideLogos(slide, y) {
  slide.addImage({ path: LOGO_1, x: 0.15, y: y + 0.05, w: 0.5, h: 0.5 })
  slide.addImage({ path: LOGO_2, x: PAGE_W_IN - 0.65, y: y + 0.03, w: 0.55, h: 0.53 })
}

function addCoverSlide(pptx, { dateLabel }) {
  const slide = pptx.addSlide()
  slide.addImage({ path: COVER_BG, x: 0, y: 0, w: PAGE_W_IN, h: PAGE_H_IN })
  slide.addText('LAPORAN VIRALISASI\nPRODUK POLRESTA BANYUWANGI', {
    x: 0.6, y: 4.3, w: PAGE_W_IN - 1.2, h: 1.8,
    fontSize: 24, bold: true, color: YELLOW, align: 'center', fontFace: 'Carlito',
  })
  slide.addText('POLRESTA BANYUWANGI', {
    x: 0.6, y: 6.2, w: PAGE_W_IN - 1.2, h: 0.5,
    fontSize: 16, bold: true, color: YELLOW, align: 'center', fontFace: 'Arial Black',
  })
  slide.addText(dateLabel, {
    x: 0.6, y: 6.7, w: PAGE_W_IN - 1.2, h: 0.4,
    fontSize: 12, bold: true, color: YELLOW, align: 'center', fontFace: 'Arial Black',
  })
}

function addStatsSlide(pptx, { stats, total }) {
  const slide = pptx.addSlide()
  addHeaderBar(slide, 'JUMLAH POSTINGAN MEDIA SOSIAL', 0)

  const header = [...stats.map((s) => s.abbr), 'TOTAL'].map((t) => ({
    text: t,
    options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center', fontFace: 'Carlito' },
  }))
  const row = [...stats.map((s) => String(s.count)), total.toLocaleString('id-ID')].map((t) => ({
    text: t,
    options: { align: 'center', fontFace: 'Carlito' },
  }))

  slide.addTable([header, row], {
    x: 0.8, y: 1.0, w: PAGE_W_IN - 1.6,
    fontSize: 12,
    border: { type: 'solid', color: 'CCCCCC', pt: 1 },
  })

  addHeaderBar(slide, 'JUMLAH ENGAGEMENT MEDIA SOSIAL', 3.2)
  // sengaja kosong - engagement gak perlu diisi
}

function addLampiranSlide(pptx) {
  const slide = pptx.addSlide()
  addHeaderBar(slide, 'LAMPIRAN KONTEN', 0)
  addSlideLogos(slide, 0)
  slide.addText('Tambahkan screenshot konten di slide ini secara manual.', {
    x: 0.6, y: 1.2, w: PAGE_W_IN - 1.2, h: 0.6,
    fontSize: 11, italic: true, color: '888888', align: 'center', fontFace: 'Carlito',
  })
}

function addLinkGroupSlide(pptx, group) {
  const slide = pptx.addSlide()
  addHeaderBar(slide, 'LINK POSTINGAN', 0)
  addSlideLogos(slide, 0)

  const colWidth = (PAGE_W_IN - 1.2) / 2
  group.columns.forEach((col, idx) => {
    const x = 0.4 + idx * (colWidth + 0.4)
    slide.addText(col.label, {
      x, y: 0.8, w: colWidth, h: 0.35,
      fontSize: 11, bold: true, color: NAVY, fontFace: 'Carlito',
    })

    if (col.links.length === 0) {
      slide.addText('-', { x, y: 1.2, w: colWidth, h: 0.3, fontSize: 8, color: '333333' })
      return
    }

    const runs = col.links.map((url, i) => ({
      text: `${i + 1}. ${url}`,
      options: { hyperlink: { url }, breakLine: true },
    }))

    // h sengaja proporsional ke jumlah link - BOLEH overflow slide, disengaja (PPT-only, scroll manual)
    slide.addText(runs, {
      x, y: 1.2, w: colWidth, h: Math.max(0.5, col.links.length * 0.15),
      fontSize: 8, color: LINK_COLOR, fontFace: 'Carlito', valign: 'top',
    })
  })
}

export async function buildViralisasiSpripimPptx(data) {
  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'A4_PORTRAIT', width: PAGE_W_IN, height: PAGE_H_IN })
  pptx.layout = 'A4_PORTRAIT'

  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  addCoverSlide(pptx, { dateLabel })
  addStatsSlide(pptx, { stats: data.stats, total: data.total })
  addLampiranSlide(pptx)
  data.linkGroups.forEach((group) => addLinkGroupSlide(pptx, group))

  return pptx.write({ outputType: 'nodebuffer' })
}