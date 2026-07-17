"use client"

import { useState, useActionState, useEffect } from 'react'
import { PencilIcon, CloseIcon } from '@/icons'
import { updateRekapSessionInfoAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'

const initialState = { error: null, success: false }

export default function EditSessionInfoModal({ session }) {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()
  const config = session.format?.config || {}
  const needTitle = config.requiredFields?.includes('title')
  const needDateRange = config.requiredFields?.includes('dateRange')

  const action = updateRekapSessionInfoAction.bind(null, session.id)
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast('Info sesi berhasil diperbarui', 'success')
      setOpen(false)
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <PencilIcon className="size-4" />
        Edit Info Sesi
      </button>

      {open && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Edit Informasi Sesi</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon className="size-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
                <input
                  type="text"
                  value={session.format.name}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-400">Format tidak bisa diubah setelah sesi dibuat</p>
              </div>

              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul / narasi {needTitle && <span className="text-error-500">*</span>}
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={session.title || ''}
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
                  defaultValue={session.dateRange || ''}
                  required={needDateRange}
                  placeholder="Contoh: 1-14 Maret 2026"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}