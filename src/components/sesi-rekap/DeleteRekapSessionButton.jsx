"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteRekapSessionAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteRekapSessionButton({ id, title }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    const label = title || 'sesi tanpa judul'
    if (!confirm(`Hapus "${label}"? Semua link di dalamnya ikut terhapus.`)) return

    startTransition(async () => {
      try {
        await deleteRekapSessionAction(id)
        showToast(`Sesi "${label}" berhasil dihapus`, 'success')
      } catch (error) {
        showToast('Gagal menghapus sesi', 'error')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Hapus sesi"
      className="text-gray-400 hover:text-error-500 disabled:opacity-50"
    >
      <TrashBinIcon className="size-4" />
    </button>
  )
}