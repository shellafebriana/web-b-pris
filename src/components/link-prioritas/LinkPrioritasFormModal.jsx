"use client"

import { useState, useActionState, useEffect } from 'react'
import { PlusIcon, CloseIcon } from '@/icons'
import { createPriorityLinkAction, updatePriorityLinkAction } from '@/app/(admin)/link-prioritas/actions'
import { useToast } from '@/context/ToastProvider'

const initialState = { error: null, success: false }

export default function LinkPrioritasFormModal({ mode = 'create', link = null }) {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()

  const action = mode === 'edit' ? updatePriorityLinkAction.bind(null, link.id) : createPriorityLinkAction
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast(mode === 'edit' ? 'Link berhasil diperbarui' : 'Link berhasil ditambahkan', 'success')
      setOpen(false)
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <PlusIcon className="size-4" />
          Tambah Link
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Edit
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {mode === 'edit' ? 'Edit Link Prioritas' : 'Tambah Link Prioritas'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon className="size-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Keyword (domain)</label>
                <input
                  type="text"
                  name="keyword"
                  defaultValue={link?.keyword || ''}
                  required
                  placeholder="Misal: kompas.com"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={link?.description || ''}
                  placeholder="Misal: Kompas.com"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={link?.isActive ?? true}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Aktif
              </label>

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