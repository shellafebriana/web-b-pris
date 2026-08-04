import ExcelJS from 'exceljs'
import { WARNA, argb, JUDUL_1, JUDUL_2, tandaBaris } from './rekapMedsosStyle'

export async function buildRekapMedsosXlsx({ data, labelJudul }) {
  const { platforms, rows, totalPerPlatform, totalSemua } = data
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIHUMAS Polresta Banyuwangi'
  wb.created = new Date()

  const ws = wb.addWorksheet('Rekap Media Sosial', {
    views: [{ state: 'frozen', ySplit: 5, xSplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const kolomTerakhir = 2 + platforms.length + 1 // NO + POLSEK + platform + TOTAL

  // --- Judul (3 baris merge) ---
  const judul = [JUDUL_1, JUDUL_2, labelJudul]
  judul.forEach((teks, i) => {
    const baris = i + 1
    ws.mergeCells(baris, 1, baris, kolomTerakhir)
    const c = ws.getCell(baris, 1)
    c.value = teks
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.font = { bold: i === 0, size: i === 0 ? 14 : 11 }
  })
  ws.getRow(4).height = 6 // spacer

  // --- Header tabel (baris 5) ---
  const headerRow = ws.getRow(5)
  headerRow.values = ['NO', 'POLSEK', ...platforms.map((p) => p.shortName), 'TOTAL']
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: argb(WARNA.headerText) } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(WARNA.headerBg) } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: argb(WARNA.garis) } } }
  })
  headerRow.height = 22

  // --- Data ---
  rows.forEach((r, i) => {
    const row = ws.addRow([
      r.rank,
      r.unitName,
      ...platforms.map((p) => r.counts[p.id]),
      r.total,
    ])
    const tanda = tandaBaris(i, rows.length, r.total)
    const bg = tanda === 'top' ? WARNA.top3 : tanda === 'bottom' ? WARNA.bottom3 : null

    row.eachCell((cell, col) => {
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center' }
      if (col === kolomTerakhir) cell.font = { bold: true }
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } }
      cell.border = { bottom: { style: 'hair', color: { argb: argb(WARNA.garis) } } }
    })
  })

  // --- Footer total ---
  const footer = ws.addRow([
    '',
    'TOTAL',
    ...platforms.map((p) => totalPerPlatform[p.id]),
    totalSemua,
  ])
  footer.eachCell((cell, col) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: col === 2 ? 'left' : 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(WARNA.footerBg) } }
  })

  // --- Lebar kolom ---
  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 20
  for (let c = 3; c < kolomTerakhir; c++) ws.getColumn(c).width = 11
  ws.getColumn(kolomTerakhir).width = 12

  return Buffer.from(await wb.xlsx.writeBuffer())
}