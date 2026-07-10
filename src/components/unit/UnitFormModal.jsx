"use client"

import { useState, useActionState, useEffect } from 'react'
import { PlusIcon, CloseIcon } from '@/icons'
import { createUnitAction, updateUnitAction } from '@/app/(admin)/unit/actions'
import { useToast } from '@/context/ToastProvider'

const initialState = { error: null, success: false }

export default function UnitFormModal({ mode = 'create', unit = null }) {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()

  const action = mode === 'edit'
    ? updateUnitAction.bind(null, unit.id)
    : createUnitAction

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast(mode === 'edit' ? 'Unit berhasil diperbarui' : 'Unit berhasil ditambahkan', 'success')
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
          Tambah Unit
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
                {mode === 'edit' ? 'Edit Unit' : 'Tambah Unit'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon className="size-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-left font-medium text-gray-700 dark:text-gray-300">Nama Unit</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={unit?.name || ''}
                  required
                  placeholder="Misal: Polsek Giri"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block  text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tipe</label>
                <select
                  name="type"
                  defaultValue={unit?.type || 'POLSEK'}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                >
                  <option value="POLRES">POLRES</option>
                  <option value="SATFUNG">SATFUNG</option>
                  <option value="POLSEK">POLSEK</option>
                </select>
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