"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteUnitAction } from '@/app/(admin)/unit/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteUnitButton({ id, name }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    if (!confirm(`Hapus unit "${name}"?`)) return

    startTransition(async () => {
      try {
        await deleteUnitAction(id)
        showToast(`Unit "${name}" berhasil dihapus`, 'success')
      } catch (error) {
        showToast('Gagal menghapus. Unit ini kemungkinan masih dipakai di data link yang ada.', 'error')
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} title="Hapus unit" className="text-gray-400 hover:text-error-500 disabled:opacity-50">
      <TrashBinIcon className="size-4" />
    </button>
  )
}