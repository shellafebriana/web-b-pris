"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deletePlatformAction } from '@/app/(admin)/platform/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeletePlatformButton({ id, name }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    if (!confirm(`Hapus platform "${name}"?`)) return

    startTransition(async () => {
      try {
        await deletePlatformAction(id)
        showToast(`Platform "${name}" berhasil dihapus`, 'success')
      } catch (error) {
        showToast('Gagal menghapus. Platform ini kemungkinan masih dipakai di data link yang ada.', 'error')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Hapus platform"
      className="text-gray-400 hover:text-error-500 disabled:opacity-50"
    >
      <TrashBinIcon className="size-4" />
    </button>
  )
}