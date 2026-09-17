"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteReportFormatAction } from '@/app/(admin)/format-rekap/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteFormatRekapButton({ id, name, totalSesi = 0 }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  const dipakai = totalSesi > 0

  const handleDelete = () => {
    if (dipakai) {
      showToast(`Format "${name}" tidak dapat dihapus karena digunakan oleh ${totalSesi} sesi rekap.`, 'error')
      return
    }
    if (!confirm(`Hapus format "${name}"?`)) return
    startTransition(async () => {
      const hasil = await deleteReportFormatAction(id)
      if (hasil?.error) {
        showToast(hasil.error, 'error')
        return
       }
      showToast(`Format "${name}" berhasil dihapus`, 'success')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title={dipakai ? `Digunakan oleh ${totalSesi} sesi rekap` : 'Hapus format'}
      className={`disabled:opacity-50 ${dipakai ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400 hover:text-error-500'}`}
    >
      <TrashBinIcon className="size-4" />
    </button>
  )
}