"use client"

import { useState } from 'react'
import { useToast } from '@/context/ToastProvider'

export default function GeneratePptxButton({ sessionId, disabled }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/laporan/viralisasi-spripim/${sessionId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Gagal generate laporan')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : 'laporan-viralisasi-spripim.pptx'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('Laporan berhasil di-generate', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading || disabled}
      title={disabled ? 'Sesi ini belum ada link' : undefined}
      className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? 'Membuat...' : 'Generate PPTX'}
    </button>
  )
}