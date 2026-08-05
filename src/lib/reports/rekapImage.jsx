import { WARNA, JUDUL_1, tandaBaris } from './rekapMedsosStyle'

const W_NO = 56
const W_ENTITAS = 210
const W_TOTAL = 96
const H_BARIS = 40
const H_HEADER_TABEL = 48
const PAD = 20
const TINGGI_JUDUL = 118

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

const lebarKolom = (jumlah) => (jumlah > 8 ? 58 : 72)

export function ukuranGambar({ data }) {
  const wKol = lebarKolom(data.columns.length)
  return {
    width: PAD * 2 + W_NO + W_ENTITAS + data.columns.length * wKol + W_TOTAL,
    height: PAD * 2 + TINGGI_JUDUL + H_HEADER_TABEL + H_BARIS * (data.rows.length + 1),
  }
}

/**
 * CATATAN SATORI (mesin ImageResponse):
 * - <table> TIDAK didukung, semua flex div
 * - div dengan >1 anak WAJIB display:'flex' eksplisit
 * - gak ada class Tailwind, semua style inline
 */
export function buildRekapElement({ data, judulCetak, labelJudul }) {
  const { columns, rows, totalPerColumn, totalSemua } = data
  const wKol = lebarKolom(columns.length)
  const { width, height } = ukuranGambar({ data })

  const sel = (isi, w, align = 'center', bold = false, warna = WARNA.teks, h = H_BARIS) => (
    <div
      style={{
        display: 'flex',
        width: w,
        height: h,
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        paddingLeft: align === 'left' ? 12 : 0,
        fontSize: 14,
        fontWeight: bold ? 700 : 400,
        color: warna,
      }}
    >
      {isi}
    </div>
  )

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: PAD }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: TINGGI_JUDUL, justifyContent: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: WARNA.teks }}>{JUDUL_1}</div>
        <div style={{ fontSize: 17, color: WARNA.teks, marginTop: 6 }}>{judulCetak}</div>
        <div style={{ fontSize: 17, color: WARNA.teks, marginTop: 2 }}>{labelJudul}</div>
      </div>

      {/* Header tabel */}
      <div style={{ display: 'flex', backgroundColor: WARNA.headerBg, height: H_HEADER_TABEL }}>
        {sel('NO', W_NO, 'center', true, WARNA.headerText, H_HEADER_TABEL)}
        {sel('POLSEK', W_ENTITAS, 'left', true, WARNA.headerText, H_HEADER_TABEL)}
        {columns.map((c) => (
          <div
            key={c.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: wKol,
              height: H_HEADER_TABEL,
              alignItems: 'center',
              justifyContent: 'center',
              color: WARNA.headerText,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</div>
            {c.subLabel && c.subLabel !== c.label && (
              <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>{c.subLabel}</div>
            )}
          </div>
        ))}
        {sel('TOTAL', W_TOTAL, 'center', true, WARNA.headerText, H_HEADER_TABEL)}
      </div>

      {rows.map((r, i) => {
        const tanda = tandaBaris(i, rows.length, r.total)
        const bg = tanda === 'top' ? WARNA.top3 : tanda === 'bottom' ? WARNA.bottom3 : WARNA.baris
        return (
          <div key={r.id} style={{ display: 'flex', backgroundColor: bg, borderBottom: `1px solid ${WARNA.garis}` }}>
            {sel(String(r.rank), W_NO, 'center', false, WARNA.teksMuted)}
            {sel(r.name, W_ENTITAS, 'left', false, WARNA.teks)}
            {columns.map((c) => (
              <div key={c.key} style={{ display: 'flex' }}>
                {sel(fmt(r.counts[c.key]), wKol, 'center', false, WARNA.teksMuted)}
              </div>
            ))}
            {sel(fmt(r.total), W_TOTAL, 'center', true, WARNA.teks)}
          </div>
        )
      })}

      <div style={{ display: 'flex', backgroundColor: WARNA.footerBg }}>
        {sel('', W_NO)}
        {sel('TOTAL', W_ENTITAS, 'left', true)}
        {columns.map((c) => (
          <div key={c.key} style={{ display: 'flex' }}>
            {sel(fmt(totalPerColumn[c.key]), wKol, 'center', true)}
          </div>
        ))}
        {sel(fmt(totalSemua), W_TOTAL, 'center', true)}
      </div>
    </div>
  )
}