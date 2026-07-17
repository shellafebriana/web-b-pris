"use client"

import { useState, useActionState, useEffect } from 'react'
import { PlusIcon, PencilIcon, CloseIcon } from '@/icons'
import { addLinkManualAction, updateLinkAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import { detectPlatformId } from '@/lib/platform-detect'
import SearchableUnitSelect from './SearchableUnitSelect'

const initialState = { error: null, success: false }

export default function LinkFormModal({
  mode = 'create',
  sessionId,
  link = null,
  platforms = [],
  allowedPlatforms = [],
  units,
  requiresUnit,
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(link?.url || '')
  const [platformId, setPlatformId] = useState('')
  const { showToast } = useToast()

  const action = mode === 'edit'
    ? updateLinkAction.bind(null, link.id, sessionId)
    : addLinkManualAction.bind(null, sessionId)

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast(mode === 'edit' ? 'Link berhasil diperbarui' : 'Link berhasil ditambahkan', 'success')
      setOpen(false)
      if (mode === 'create') {
        setUrl('')
        setPlatformId('')
      }
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  // Live-deteksi platform dari domain URL — cuma jalan pas mode create
  const detectedId = mode === 'create' && url.trim() ? detectPlatformId(url.trim(), platforms) : null
  const detected = detectedId ? platforms.find((p) => p.id === detectedId) : null
  const detectedIsAllowed = detected ? allowedPlatforms.some((p) => p.id === detected.id) : true

  useEffect(() => {
    if (mode === 'create' && detectedId && detectedIsAllowed) {
      setPlatformId(detectedId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedId])

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <PlusIcon className="size-4" />
          Tambah Link
        </button>
      ) : (
        <button onClick={() => setOpen(true)} title="Edit link" className="text-gray-300 hover:text-brand-500 dark:text-gray-600">
          <PencilIcon className="size-4" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {mode === 'edit' ? 'Edit Link' : 'Tambah Link Manual'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon className="size-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
                <input
                  type="text"
                  name="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                />
              </div>

              {mode === 'create' && (
                <div>
                  <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">Platform</label>
                  {allowedPlatforms.length === 0 ? (
                    <p className="text-xs text-error-500">
                      Format sesi ini gak punya platform valid — cek konfigurasi Format Rekap-nya.
                    </p>
                  ) : (
                    <>
                      <select
                        name="platformId"
                        required
                        value={platformId}
                        onChange={(e) => setPlatformId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
                      >
                        <option value="" disabled>— pilih platform —</option>
                        {allowedPlatforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {detected && !detectedIsAllowed && (
                        <p className="mt-1 text-xs text-error-500">
                          ⚠ URL ini kedeteksi dari <strong>{detected.name}</strong>, tapi format sesi ini gak nerima
                          platform itu — cek lagi URL-nya bener gak.
                        </p>
                      )}
                      {detected && detectedIsAllowed && platformId === detected.id && (
                        <p className="mt-1 text-xs text-success-600 dark:text-success-400">
                          ✓ Otomatis kedeteksi sebagai {detected.name}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {requiresUnit && (
                <div>
                  <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit <span className="font-normal text-gray-400">(opsional)</span>
                  </label>
                  <SearchableUnitSelect units={units} name="unitId" defaultValue={link?.unit?.id || ''} />
                </div>
              )}

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