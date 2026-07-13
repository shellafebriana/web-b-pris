"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deletePriorityLinkAction } from '@/app/(admin)/link-prioritas/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteLinkPrioritasButton({ id, keyword }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    if (!confirm(`Hapus link prioritas "${keyword}"?`)) return
    startTransition(async () => {
      try {
        await deletePriorityLinkAction(id)
        showToast(`Link "${keyword}" berhasil dihapus`, 'success')
      } catch (error) {
        showToast('Gagal menghapus link.', 'error')
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} title="Hapus link" className="text-gray-400 hover:text-error-500 disabled:opacity-50">
      <TrashBinIcon className="size-4" />
    </button>
  )
}