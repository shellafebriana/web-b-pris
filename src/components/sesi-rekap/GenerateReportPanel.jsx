"use client"

import { useState, useTransition } from 'react'
import { generateReportAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'

export default function GenerateReportPanel({ sessionId, initialText, hasLinks }) {
  const [text, setText] = useState(initialText || '')
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateReportAction(sessionId)
      if (result?.error) {
        showToast(result.error, 'error')
      } else {
        setText(result.text)
        showToast('Laporan berhasil di-generate', 'success')
      }
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3" style={{ maxHeight: 'calc(60vh + 100px)' }}>
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasil Laporan</span>
        {text && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            ✓ Generated
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {text ? (
          <pre className="min-w-0 whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {text}
          </pre>
        ) : (
          <p className="py-10 text-center text-sm text-gray-300 dark:text-gray-600">
            {hasLinks ? 'Klik "Generate Laporan" buat lihat hasilnya' : 'Belum ada link buat di-generate'}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <button
          onClick={handleGenerate}
          disabled={isPending || !hasLinks}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
        >
          {isPending ? 'Generating...' : text ? '⟳ Regenerate' : '⚡ Generate Laporan'}
        </button>
        <button
          onClick={handleCopy}
          disabled={!text}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40 ${
            copied
              ? 'bg-success-500 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {copied ? '✓ Tersalin!' : 'Copy WA'}
        </button>
      </div>
    </div>
  )
}