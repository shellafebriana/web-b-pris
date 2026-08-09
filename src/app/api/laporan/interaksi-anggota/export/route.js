import { NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import ExcelJS from 'exceljs'
import { getAuthUser } from '@/lib/auth'
import { parsePeriode } from '@/lib/laporan/periode'
import { getStatusInteraksi } from '@/lib/models/interaksi'
import { WARNA, argb, JUDUL_1 } from '@/lib/reports/rekapMedsosStyle'

export const runtime = 'nodejs'

const JUDUL_2 = 'REKAP PENGIRIMAN LAPORAN INTERAKSI ANGGOTA POLSEK JAJARAN'
const BG = { BELUM: '#fbdedc', TERLAMBAT: '#fdf3d7', SUDAH: '#d9f2e4' }

export async function GET(request) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  if (!['png', 'xlsx'].includes(type)) {
    return NextResponse.json({ error: 'Tipe export tidak valid' }, { status: 400 })
  }

  const periode = parsePeriode({ mode: 'bulanan', periode: sp.get('periode') })
  const { rows } = await getStatusInteraksi(periode.periode)
  const namaFile = `rekap-interaksi-anggota-${periode.periode}`.replace(/[^a-z0-9-]/gi, '')

  // ---------- EXCEL ----------
  if (type === 'xlsx') {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'SIHUMAS Polresta Banyuwangi'
    const ws = wb.addWorksheet('Interaksi Anggota', { views: [{ state: 'frozen', ySplit: 5 }] })

    ;[JUDUL_1, JUDUL_2, periode.labelJudul].forEach((t, i) => {
      ws.mergeCells(i + 1, 1, i + 1, 4)
      const c = ws.getCell(i + 1, 1)
      c.value = t
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.font = { bold: i === 0, size: i === 0 ? 14 : 11 }
    })
    ws.getRow(4).height = 6

    const head = ws.getRow(5)
    head.values = ['NO', 'POLSEK', 'STATUS', 'LINK GDRIVE']
    head.eachCell((c) => {
      c.font = { bold: true, color: { argb: argb(WARNA.headerText) } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(WARNA.headerBg) } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    head.height = 22

    rows.forEach((r, i) => {
      const row = ws.addRow([i + 1, r.unitName, r.status, r.linkDrive || '—'])
      row.eachCell((c, col) => {
        c.alignment = { horizontal: col === 2 || col === 4 ? 'left' : 'center' }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BG[r.status]) } }
      })
      // Hyperlink asli — kelebihan Excel dibanding PNG.
      if (r.linkDrive) {
        const c = row.getCell(4)
        c.value = { text: r.linkDrive, hyperlink: r.linkDrive }
        c.font = { color: { argb: 'FF1449B0' }, underline: true }
      }
    })

    ws.getColumn(1).width = 6
    ws.getColumn(2).width = 20
    ws.getColumn(3).width = 14
    ws.getColumn(4).width = 60

    return new NextResponse(Buffer.from(await wb.xlsx.writeBuffer()), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFile}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // ---------- PNG ----------
  // Link sengaja TIDAK ditampilkan: URL panjang tidak muat, dan kolom berisi
  // "Ada"/"—" tidak menambah informasi karena status sudah mewakilinya.
  const W = { no: 56, unit: 420, status: 240 }
  const H = 40
  const width = 40 + W.no + W.unit + W.status
  const height = 40 + 118 + 48 + H * rows.length

  const sel = (isi, w, align, bold, warna, h = H) => (
    <div
      style={{
        display: 'flex',
        width: w,
        height: h,
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        paddingLeft: align === 'left' ? 16 : 0,
        fontSize: 14,
        fontWeight: bold ? 700 : 400,
        color: warna || WARNA.teks,
      }}
    >
      {isi}
    </div>
  )

  const img = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: 118,
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: WARNA.teks }}>{JUDUL_1}</div>
          <div style={{ fontSize: 15, marginTop: 6, color: WARNA.teks }}>{JUDUL_2}</div>
          <div style={{ fontSize: 16, marginTop: 2, color: WARNA.teks }}>{periode.labelJudul}</div>
        </div>

        <div style={{ display: 'flex', backgroundColor: WARNA.headerBg, height: 48 }}>
          {sel('NO', W.no, 'center', true, WARNA.headerText, 48)}
          {sel('POLSEK', W.unit, 'left', true, WARNA.headerText, 48)}
          {sel('STATUS', W.status, 'center', true, WARNA.headerText, 48)}
        </div>

        {rows.map((r, i) => (
          <div
            key={r.unitId}
            style={{
              display: 'flex',
              backgroundColor: BG[r.status],
              borderBottom: `1px solid ${WARNA.garis}`,
            }}
          >
            {sel(String(i + 1), W.no, 'center', false, WARNA.teksMuted)}
            {sel(r.unitName, W.unit, 'left', false)}
            {sel(r.status, W.status, 'center', true)}
          </div>
        ))}
      </div>
    ),
    { width, height }
  )

  return new NextResponse(img.body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${namaFile}.png"`,
      'Cache-Control': 'no-store',
    },
  })
}