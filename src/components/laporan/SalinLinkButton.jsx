'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastProvider'

const escHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Fallback rich-text: seleksi elemen contenteditable lalu execCommand('copy').
// Ini yang bikin hyperlink tetap kebawa walau ClipboardItem gak tersedia
// (browser lama, atau web dibuka via HTTP/IP LAN — clipboard API cuma jalan di HTTPS).
function salinViaSeleksi(html) {
  const div = document.createElement('div')
  div.setAttribute('contenteditable', 'true')
  div.innerHTML = html
  div.style.position = 'fixed'
  div.style.top = '-1000px'
  div.style.opacity = '0'
  document.body.appendChild(div)

  const range = document.createRange()
  range.selectNodeContents(div)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)

  const ok = document.execCommand('copy')
  sel.removeAllRanges()
  document.body.removeChild(div)
  if (!ok) throw new Error('gagal')
}

export default function SalinLinkButton({ targetId, label = 'Salin semua link' }) {
  const { showToast } = useToast()
  const [sibuk, setSibuk] = useState(false)

  const salin = async () => {
    // Baca dari DOM yang udah dirender, bukan dari prop — biar isi halaman
    // gak dikirim dua kali (sesi bisa ribuan link)
    const wadah = document.getElementById(targetId)
    const els = wadah ? Array.from(wadah.querySelectorAll('[data-url]')) : []

    if (els.length === 0) {
      showToast('Gak ada link buat disalin', 'error')
      return
    }

    const teks = els.map((el) => el.dataset.url).join('\n')
    // Cuma yang dirender sebagai <a> yang jadi hyperlink — URL gak valid
    // udah disaring di server, di sini ikut sebagai teks biasa
    const html = els
      .map((el) => {
        const u = escHtml(el.dataset.url)
        return el.tagName === 'A' ? `<div><a href="${u}">${u}</a></div>` : `<div>${u}</div>`
      })
      .join('')

    setSibuk(true)
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([teks], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ])
      } else {
        salinViaSeleksi(html)
      }
      showToast(`${els.length} link tersalin`, 'success')
    } catch {
      try {
        salinViaSeleksi(html)
        showToast(`${els.length} link tersalin`, 'success')
      } catch {
        showToast('Browser nolak akses clipboard — blok manual lalu Ctrl+C ya', 'error')
      }
    } finally {
      setSibuk(false)
    }
  }

  return (
    <button
      type="button"
      onClick={salin}
      disabled={sibuk}
      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-brand-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
    >
      {sibuk ? 'Menyalin...' : label}
    </button>
  )
}