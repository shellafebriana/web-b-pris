export function formatNumber(num) {
  // Jika undefined atau null, return 0
  if (num === null || num === undefined) return '0'
  
  // Jika >= 100.000, format jadi k (contoh: 150.000 → 150k)
  if (num >= 100000) {
    return (num / 1000).toFixed(0) + 'k'
  }
  
  // Jika < 100.000, format dengan pemisah titik (contoh: 4.323)
  return num.toLocaleString('id-ID')
}