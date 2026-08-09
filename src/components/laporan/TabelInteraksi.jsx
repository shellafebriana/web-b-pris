'use client'

import { useActionState, useEffect, useState } from 'react'
import { useToast } from '@/context/ToastProvider'
import { simpanStatusAction } from '@/app/(admin)/laporan/interaksi-anggota/actions'

const WARNA = {
  BELUM: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
  TERLAMBAT: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  SUDAH: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
}

export default function TabelInteraksi({ periode, data }) {
  const { showToast } = useToast()
  const [rows, setRows] = useState(data.rows)
  const [state, formAction, pending] = useActionState(simpanStatusAction, {})

  // Server Component me-refresh setelah simpan; sinkronkan state lokal.
  useEffect(() => setRows(data.rows), [data.rows])

  useEffect(() => {
    if (state?.success) showToast(state.success, 'success')
    if (state?.error) showToast(state.error, 'error')
  }, [state, showToast])

  const ubah = (unitId, field, nilai) =>
    setRows((r) => r.map((x) => (x.unitId === unitId ? { ...x, [field]: nilai } : x)))

  const hitung = rows.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {})

  return ( 
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="periode" value={periode} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          rows.map((r) => ({
            unitId: r.unitId,
            status: r.status,
            linkDrive: r.linkDrive,
            keterangan: r.keterangan,
          }))
        )}
      />

      <div className="grid grid-cols-3 gap-3">
        {['SUDAH', 'TERLAMBAT', 'BELUM'].map((s) => (
          <div key={s} className={`rounded-xl p-3 ${WARNA[s]}`}>
            <p className="text-xs font-medium opacity-80">{s}</p>
            <p className="text-xl font-bold">{hitung[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-14 px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">NO</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">POLSEK</th>
              <th className="w-40 px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">STATUS</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">LINK GDRIVE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.unitId} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                <td className="whitespace-nowrap px-5 py-2 font-medium text-gray-800 dark:text-gray-200">
                  {r.unitName}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.status}
                    onChange={(e) => ubah(r.unitId, 'status', e.target.value)}
                    className={`w-full rounded-lg border-0 px-3 py-2 text-xs font-semibold ${WARNA[r.status]}`}
                  >
                    <option value="BELUM">BELUM</option>
                    <option value="SUDAH">SUDAH</option>
                    <option value="TERLAMBAT">TERLAMBAT</option>
                  </select>
                </td>
                <td className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={r.linkDrive}
                      onChange={(e) => ubah(r.unitId, 'linkDrive', e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
                    />
                    {r.linkDrive && (
                      <a
                        href={r.linkDrive}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-brand-500 hover:underline"
                      >
                        Buka
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
      </button>
    </form>
  )
}