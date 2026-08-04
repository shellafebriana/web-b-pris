import { WARNA, JUDUL_1, JUDUL_2, tandaBaris } from './rekapMedsosStyle'

const W_NO = 56
const W_POLSEK = 210
const W_PLATFORM = 68
const W_TOTAL = 96
const H_BARIS = 40
const PAD = 20

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

/**
 * CATATAN SATORI (mesin di balik ImageResponse):
 * - <table> TIDAK didukung, semua pakai flex div
 * - setiap div dengan >1 anak WAJIB punya display:'flex' eksplisit
 * - gak ada CSS eksternal / class Tailwind, semua style inline
 */
export function buildRekapMedsosElement({ data, labelJudul }) {
  const { platforms, rows, totalPerPlatform, totalSemua } = data

  const lebar = PAD * 2 + W_NO + W_POLSEK + platforms.length * W_PLATFORM + W_TOTAL
  const tinggiHeader = 118
  const tinggi = PAD * 2 + tinggiHeader + H_BARIS * (rows.length + 2)

  const sel = (isi, lebarSel, align = 'center', bold = false, warna = WARNA.teks) => (
    <div
      style={{
        display: 'flex',
        width: lebarSel,
        height: H_BARIS,
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
    <div
      style={{
        width: lebar,
        height: tinggi,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: PAD,
      }}
    >
      {/* Judul */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: tinggiHeader,
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: WARNA.teks }}>{JUDUL_1}</div>
        <div style={{ fontSize: 17, color: WARNA.teks, marginTop: 6 }}>{JUDUL_2}</div>
        <div style={{ fontSize: 17, color: WARNA.teks, marginTop: 2 }}>{labelJudul}</div>
      </div>

      {/* Header tabel */}
      <div style={{ display: 'flex', backgroundColor: WARNA.headerBg }}>
        {sel('NO', W_NO, 'center', true, WARNA.headerText)}
        {sel('POLSEK', W_POLSEK, 'left', true, WARNA.headerText)}
        {platforms.map((p) => (
          <div key={p.id} style={{ display: 'flex' }}>
            {sel(p.shortName, W_PLATFORM, 'center', true, WARNA.headerText)}
          </div>
        ))}
        {sel('TOTAL', W_TOTAL, 'center', true, WARNA.headerText)}
      </div>

      {/* Baris data */}
      {rows.map((r, i) => {
        const tanda = tandaBaris(i, rows.length, r.total)
        const bg = tanda === 'top' ? WARNA.top3 : tanda === 'bottom' ? WARNA.bottom3 : WARNA.baris
        return (
          <div
            key={r.unitId}
            style={{
              display: 'flex',
              backgroundColor: bg,
              borderBottom: `1px solid ${WARNA.garis}`,
            }}
          >
            {sel(String(r.rank), W_NO, 'center', false, WARNA.teksMuted)}
            {sel(r.unitName, W_POLSEK, 'left', false, WARNA.teks)}
            {platforms.map((p) => (
              <div key={p.id} style={{ display: 'flex' }}>
                {sel(fmt(r.counts[p.id]), W_PLATFORM, 'center', false, WARNA.teksMuted)}
              </div>
            ))}
            {sel(fmt(r.total), W_TOTAL, 'center', true, WARNA.teks)}
          </div>
        )
      })}

      {/* Footer total */}
      <div style={{ display: 'flex', backgroundColor: WARNA.footerBg }}>
        {sel('', W_NO)}
        {sel('TOTAL', W_POLSEK, 'left', true)}
        {platforms.map((p) => (
          <div key={p.id} style={{ display: 'flex' }}>
            {sel(fmt(totalPerPlatform[p.id]), W_PLATFORM, 'center', true)}
          </div>
        ))}
        {sel(fmt(totalSemua), W_TOTAL, 'center', true)}
      </div>
    </div>
  )
}

/** Dimensi kanvas — dipakai route buat ImageResponse. */
export function ukuranGambar({ data }) {
  const { platforms, rows } = data
  return {
    width: PAD * 2 + W_NO + W_POLSEK + platforms.length * W_PLATFORM + W_TOTAL,
    height: PAD * 2 + 118 + H_BARIS * (rows.length + 2),
  }
}