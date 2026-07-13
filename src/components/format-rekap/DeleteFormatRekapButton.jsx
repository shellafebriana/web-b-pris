"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteReportFormatAction } from '@/app/(admin)/format-rekap/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteFormatRekapButton({ id, name }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    if (!confirm(`Hapus format "${name}"?`)) return
    startTransition(async () => {
      try {
        await deleteReportFormatAction(id)
        showToast(`Format "${name}" berhasil dihapus`, 'success')
      } catch (error) {
        showToast('Gagal menghapus. Format ini kemungkinan masih dipakai di sesi rekap yang ada.', 'error')
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} title="Hapus format" className="text-gray-400 hover:text-error-500 disabled:opacity-50">
      <TrashBinIcon className="size-4" />
    </button>
  )
}