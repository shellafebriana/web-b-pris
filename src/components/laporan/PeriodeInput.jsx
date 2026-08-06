'use client'

/**
 * Input tanggal/bulan/tahun yang membuka picker begitu diklik di mana pun.
 * Default Chrome: picker cuma kebuka lewat ikon kalender kecil di kanan,
 * jadi kelihatannya harus diketik manual.
 */
export default function PeriodeInput({ mode, nilai, tahunIni }) {
  const type = mode === 'harian' ? 'date' : mode === 'bulanan' ? 'month' : 'number'

  function bukaPicker(e) {
    if (type === 'number') return
    // showPicker() bisa throw kalau browser gak support atau dianggap bukan
    // hasil interaksi user. Diamkan — field-nya tetap bisa diketik manual.
    try {
      e.currentTarget.showPicker()
    } catch {}
  }

  return (
    <input
      id="periode"
      name="periode"
      type={type}
      defaultValue={nilai}
      onClick={bukaPicker}
      min={type === 'number' ? 2020 : undefined}
      max={type === 'number' ? tahunIni + 1 : undefined}
      style={{ colorScheme: 'light dark' }}
      className="w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
    />
  )
}