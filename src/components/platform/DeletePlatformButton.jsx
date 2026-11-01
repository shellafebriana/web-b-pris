"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deletePlatformAction } from '@/app/(admin)/platform/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeletePlatformButton({ id, name, totalLinks = 0 }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  const dipakai = totalLinks > 0

  const handleDelete = () => {
    if (dipakai) {
      showToast(`Platform "${name}" tidak dapat dihapus karena digunakan oleh ${totalLinks} link.`, 'error')
      return
    }
    if (!confirm(`Hapus platform "${name}"?`)) return

    startTransition(async () => {
      const hasil = await deletePlatformAction(id)
      if (hasil?.error) {
        showToast(hasil.error, 'error')
        return
       }
      showToast(`Platform "${name}" berhasil dihapus`, 'success')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title={dipakai ? `Digunakan oleh ${totalLinks} link` : 'Hapus platform'}
      className={`disabled:opacity-50 ${dipakai ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400 hover:text-error-500'}`}
    >
      <TrashBinIcon className="size-4" />
    </button>
  )
}