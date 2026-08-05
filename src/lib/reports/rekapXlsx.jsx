import ExcelJS from 'exceljs'
import { WARNA, argb, JUDUL_1, tandaBaris } from './rekapMedsosStyle'

export async function buildRekapXlsx({ data, judulCetak, labelJudul, kolomEntitas = 'POLSEK' }) {
  const { columns, rows, totalPerColumn, totalSemua } = data
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIHUMAS Polresta Banyuwangi'
  wb.created = new Date()

  const ws = wb.addWorksheet('Rekap', {
    views: [{ state: 'frozen', ySplit: 5, xSplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const kolomTerakhir = 2 + columns.length + 1

  const judul = [JUDUL_1, judulCetak, labelJudul]
  judul.forEach((teks, i) => {
    const baris = i + 1
    ws.mergeCells(baris, 1, baris, kolomTerakhir)
    const c = ws.getCell(baris, 1)
    c.value = teks
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.font = { bold: i === 0, size: i === 0 ? 14 : 11 }
  })
  ws.getRow(4).height = 6

  const headerRow = ws.getRow(5)
  headerRow.values = [
    'NO',
    kolomEntitas,
    ...columns.map((c) => (c.subLabel && c.subLabel !== c.label ? `${c.label}\n(${c.subLabel})` : c.label)),
    'TOTAL',
  ]
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: argb(WARNA.headerText) } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(WARNA.headerBg) } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  headerRow.height = 30

  rows.forEach((r, i) => {
    const row = ws.addRow([r.rank, r.name, ...columns.map((c) => r.counts[c.key]), r.total])
    const tanda = tandaBaris(i, rows.length, r.total)
    const bg = tanda === 'top' ? WARNA.top3 : tanda === 'bottom' ? WARNA.bottom3 : null
    row.eachCell((cell, col) => {
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center' }
      if (col === kolomTerakhir) cell.font = { bold: true }
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } }
      cell.border = { bottom: { style: 'hair', color: { argb: argb(WARNA.garis) } } }
    })
  })

  const footer = ws.addRow([
    '',
    'TOTAL',
    ...columns.map((c) => totalPerColumn[c.key]),
    totalSemua,
  ])
  footer.eachCell((cell, col) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: col === 2 ? 'left' : 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(WARNA.footerBg) } }
  })

  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 20
  for (let c = 3; c < kolomTerakhir; c++) ws.getColumn(c).width = 13
  ws.getColumn(kolomTerakhir).width = 12

  return Buffer.from(await wb.xlsx.writeBuffer())
}