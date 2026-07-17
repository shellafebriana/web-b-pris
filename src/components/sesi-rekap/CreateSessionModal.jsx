"use client"

import { useState, useActionState, useEffect } from 'react'
import { PlusIcon, CloseIcon } from '@/icons'
import { createRekapSessionAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'

const initialState = { error: null }

export default function CreateSessionModal({ formats }) {
  const [open, setOpen] = useState(false)
  const [formatId, setFormatId] = useState('')
  const { showToast } = useToast()

  const [state, formAction, isPending] = useActionState(createRekapSessionAction, initialState)

  useEffect(() => {
    if (state?.error) showToast(state.error, 'error')
  }, [state])

  const selectedFormat = formats.find((f) => f.id === formatId)
  const config = selectedFormat?.config || {}
  const needTitle = config.requiredFields?.includes('title')
  const needDateRange = config.requiredFields?.includes('dateRange')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        <PlusIcon className="size-4" />
        Buat Sesi
      </button>

      {open && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Buat Sesi Rekap Baru</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon className="size-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Format <span className="text-error-500">*</span>
                </label>
                <select
                  name="formatId"
                  required
                  value={formatId}
                  onChange={(e) => setFormatId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="" disabled>— pilih format —</option>
                  {formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul / narasi {needTitle && <span className="text-error-500">*</span>}
                </label>
                <input
                  type="text"
                  name="title"
                  required={needTitle}
                  placeholder="Judul pemberitaan..."
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Periode tanggal {needDateRange && <span className="text-error-500">*</span>}
                </label>
                <input
                  type="text"
                  name="dateRange"
                  required={needDateRange}
                  placeholder="Contoh: 1-14 Maret 2026"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {isPending ? 'Membuat...' : 'Buat Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}