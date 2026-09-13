"use client"

import { useTransition } from 'react'
import { TrashBinIcon } from '@/icons'
import { deleteUnitAction } from '@/app/(admin)/unit/actions'
import { useToast } from '@/context/ToastProvider'

// Rincian pemakaian dipakai untuk menolak lebih awal, bukan menunggu database
// yang menolak — pesannya jadi menyebut penyebab sebenarnya.
function rincianPemakaian(pemakaian) {
  const bagian = []
  if (pemakaian.links > 0) bagian.push(`${pemakaian.links} link`)
  if (pemakaian.rilis > 0) bagian.push(`${pemakaian.rilis} rilis`)
  if (pemakaian.interaksi > 0) bagian.push(`${pemakaian.interaksi} data interaksi`)
  return bagian.join(', ')
}

export default function DeleteUnitButton({ id, name, pemakaian }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const dipakai = pemakaian?.total > 0

  const handleDelete = () => {
    if (dipakai) {
      showToast(
        `"${name}" tidak bisa dihapus karena masih dipakai di ${rincianPemakaian(pemakaian)}.`,
        'error'
      )
      return
    }

    if (!confirm(`Hapus unit "${name}"?`)) return

    startTransition(async () => {
      const hasil = await deleteUnitAction(id)
      if (hasil?.error) {
        showToast(hasil.error, 'error')
        return
      }
      showToast(`Unit "${name}" berhasil dihapus`, 'success')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title={dipakai ? `Masih dipakai di ${rincianPemakaian(pemakaian)}` : 'Hapus unit'}
      className={`disabled:opacity-50 ${
        dipakai
          ? 'text-gray-300 dark:text-gray-700'
          : 'text-gray-400 hover:text-error-500'
      }`}
    >
      <TrashBinIcon className="size-4" />
    </button>
  )
}