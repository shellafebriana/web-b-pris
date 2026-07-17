"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteLinkAction } from '@/app/(admin)/sesi-rekap/actions'
import { useToast } from '@/context/ToastProvider'

export default function DeleteLinkButton({ linkId, sessionId, url }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handleDelete = () => {
    if (!confirm(`Hapus link ini?\n${url}`)) return
    startTransition(async () => {
      try {
        await deleteLinkAction(linkId, sessionId)
        showToast('Link berhasil dihapus', 'success')
      } catch (error) {
        showToast('Gagal menghapus link', 'error')
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} title="Hapus link" className="text-gray-300 hover:text-error-500 disabled:opacity-50 dark:text-gray-600">
      <TrashBinIcon className="size-4" />
    </button>
  )
}