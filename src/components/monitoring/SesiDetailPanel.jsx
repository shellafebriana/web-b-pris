'use client'

import { useEffect, useMemo, useState, useTransition, useActionState } from 'react'
import { useToast } from '@/context/ToastProvider'
import {
  tambahItemAction,
  ubahItemAction,
  ubahKategoriAction,
  hapusItemAction,
  ubahStateAction,
  tandaiReviewSesiAction,
} from '@/app/(admin)/monitoring/actions'
import Link from 'next/link'

const KANAL = [
  { kode: 'ONLINE', label: 'Media Online' },
  { kode: 'SOSMED', label: 'Media Sosial' },
]

export default function SesiDetailPanel({ sesi }) {
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [modalBuka, setModalBuka] = useState(false)
  const [kanalAktif, setKanalAktif] = useState('ONLINE')
  const [hanyaReview, setHanyaReview] = useState(false)
  const [pilihan, setPilihan] = useState(() => new Set())
  const [itemEdit, setItemEdit] = useState(null)
  const final = sesi.state === 'final'

  const petaKategori = useMemo(
    () => new Map(sesi.kategori.map((k) => [k.id, k])),
    [sesi.kategori]
  )

  const perluReview = sesi.items.filter((i) => !i.isReviewed).length

  const tampil = useMemo(() => {
    const dipilih = sesi.items.filter(
      (i) => i.kanal === kanalAktif && (!hanyaReview || !i.isReviewed)
    )
    const grup = new Map()
    for (const it of dipilih) {
      const arr = grup.get(it.kategoriId) ?? []
      arr.push(it)
      grup.set(it.kategoriId, arr)
    }
    return [...grup.entries()]
      .map(([kategoriId, items]) => ({ kategori: petaKategori.get(kategoriId), items }))
      .filter((g) => g.kategori)
      .sort((a, b) => a.kategori.sortOrder - b.kategori.sortOrder)
  }, [sesi.items, kanalAktif, hanyaReview, petaKategori])

  function gantiKategori(itemId, kategoriId) {
    startTransition(async () => {
      const r = await ubahKategoriAction(itemId, kategoriId, sesi.id)
      showToast(r?.error ?? 'Kategori diperbarui', r?.error ? 'error' : 'success')
    })
  }

  function hapus(itemId) {
    if (!confirm('Hapus item ini dari sesi?')) return
    startTransition(async () => {
      const r = await hapusItemAction(itemId, sesi.id)
      showToast(r?.error ?? 'Item dihapus', r?.error ? 'error' : 'success')
    })
  }

  function gantiState() {
    const tujuan = final ? 'draft' : 'final'
    startTransition(async () => {
      const r = await ubahStateAction(sesi.id, tujuan)
      showToast(
        r?.error ?? (tujuan === 'final' ? 'Sesi difinalkan' : 'Sesi dibuka kembali'),
        r?.error ? 'error' : 'success'
      )
    })
  }

  const tampilId = tampil.flatMap((g) => g.items.filter((i) => !i.isReviewed).map((i) => i.id))
  const semuaTercentang = tampilId.length > 0 && tampilId.every((id) => pilihan.has(id))

  function togglePilih(id) {
    setPilihan((lama) => {
      const baru = new Set(lama)
      baru.has(id) ? baru.delete(id) : baru.add(id)
      return baru
    })
  }

  function tandaiBenar() {
    const ids = [...pilihan]
    startTransition(async () => {
      const r = await tandaiReviewSesiAction(ids, sesi.id)
      if (r?.error) return showToast(r.error, 'error')
      showToast(`${ids.length} item ditandai sudah benar`, 'success')
      setPilihan(new Set())
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {KANAL.map((k) => {
            const n = sesi.items.filter((i) => i.kanal === k.kode).length
            return (
              <button
                key={k.kode}
                type="button"
                onClick={() => setKanalAktif(k.kode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  kanalAktif === k.kode
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {k.label} ({n})
              </button>
            )
          })}
        </div>

        {perluReview > 0 ? (
          <button
            type="button"
            onClick={() => setHanyaReview((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              hanyaReview
                ? 'bg-warning-500 text-white'
                : 'bg-warning-50 text-warning-600 hover:bg-warning-100 dark:bg-warning-500/15 dark:text-orange-400'
            }`}
          >
            {perluReview} perlu review
          </button>
        ) : null}
        
        <div className="ml-auto flex gap-2">
          <Link
            href={`/monitoring/${sesi.id}/laporan`}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            Lihat laporan
          </Link>
          {!final ? (
            <button
              type="button"
              onClick={() => setModalBuka(true)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Tambah item
            </button>
          ) : null}
          <button
            type="button"
            onClick={gantiState}
            disabled={pending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {final ? 'Buka kembali' : 'Finalkan'}
          </button>
        </div>
      </div>

      {!final && tampilId.length > 0 && tampilId.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={semuaTercentang}
              onChange={() => setPilihan(semuaTercentang ? new Set() : new Set(tampilId))}
              className="size-4 accent-brand-500"
            />
            Centang semua yang perlu review ({tampilId.length})
          </label>

          {pilihan.size > 0 ? (
            <button
              type="button"
              onClick={tandaiBenar}
              disabled={pending}
              className="ml-auto rounded-lg bg-success-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
            >
              Tandai {pilihan.size} sudah benar
            </button>
          ) : null}
        </div>
      ) : null}

      {tampil.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hanyaReview ? 'Tidak ada item yang perlu direview di kanal ini.' : 'Belum ada item di kanal ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tampil.map((g) => (
            <div
              key={g.kategori.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {g.kategori.sortOrder}. {g.kategori.nama}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{g.items.length} item</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {g.items.map((it) => (
                  <div
                    key={it.id}
                    className={`flex gap-3 px-5 py-3 ${!it.isReviewed ? 'bg-warning-50/50 dark:bg-warning-500/5' : ''}`}
                  >
                    {!final && !it.isReviewed ? (
                      <input
                        type="checkbox"
                        checked={pilihan.has(it.id)}
                        onChange={() => togglePilih(it.id)}
                        aria-label={`Pilih ${it.judul}`}
                        className="mt-1 size-4 flex-none accent-brand-500"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-white/90">{it.judul}</p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-[220px] truncate text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {it.sumber ?? it.url}
                        </a>
                        {!it.isReviewed ? (
                          <span className="rounded-full bg-warning-50 px-2 py-0.5 font-medium text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">
                            perlu review
                          </span>
                        ) : null}

                        <select
                          value={it.kategoriId}
                          onChange={(e) => gantiKategori(it.id, e.target.value)}
                          disabled={final || pending}
                          className="ml-auto rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {sesi.kategori.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.sortOrder}. {k.nama}
                            </option>
                          ))}
                        </select>

                        {!final ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setItemEdit(it)}
                              disabled={pending}
                              className="text-gray-400 hover:text-brand-500 disabled:opacity-50"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => hapus(it.id)}
                              disabled={pending}
                              className="text-gray-400 hover:text-error-500 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalBuka ? (
        <ModalTambah
          sesi={sesi}
          onTutup={() => setModalBuka(false)}
          onSukses={(pesan) => showToast(pesan, 'success')}
          onGagal={(pesan) => showToast(pesan, 'error')}
        />
      ) : null}

      {itemEdit ? (
        <ModalUbah
          item={itemEdit}
          sesiId={sesi.id}
          onTutup={() => setItemEdit(null)}
          onSukses={(pesan) => showToast(pesan, 'success')}
          onGagal={(pesan) => showToast(pesan, 'error')}
        />
      ) : null}
    </div>
  )
}

function ModalTambah({ sesi, onTutup, onSukses, onGagal }) {
  const [state, formAction, pending] = useActionState(
    tambahItemAction.bind(null, sesi.id),
    null
  )

  useEffect(() => {
    if (!state) return
    if (state.error) {
      onGagal(state.error)
    } else if (state.sukses) {
      onSukses(state.sukses)
      onTutup()
    }
  }, [state])

  return (
    <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Tambah item</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kanal ditentukan otomatis dari alamat link. Bisa banyak baris sekaligus."
        </p>

        <form action={formAction} className="mt-4 space-y-3">
          <div>
            <label htmlFor="tempelan" className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
              Tempel judul dan link
            </label>
            <textarea
              id="tempelan"
              name="tempelan"
              rows={7}
              required
              placeholder={"Upacara HUT RI di Banyuwangi Dipadati Warga  https://beritajatim.com/...\n\nBisa banyak sekaligus, satu berita per baris."}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Judul dan link dipisah otomatis. Bisa tempel banyak baris sekaligus.
            </p>
          </div>

          <div>
            <label htmlFor="kategoriId" className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
              Kategori
            </label>
            <select
              id="kategoriId"
              name="kategoriId"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Sarankan otomatis</option>
              {sesi.kategori.map((k) => (
                <option key={k.id} value={k.id}>{k.sortOrder}. {k.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onTutup}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {pending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalUbah({ item, sesiId, onTutup, onSukses, onGagal }) {
  const [state, formAction, pending] = useActionState(
    ubahItemAction.bind(null, item.id, sesiId),
    null
  )

  useEffect(() => {
    if (!state) return
    if (state.error) onGagal(state.error)
    else if (state.sukses) {
      onSukses(state.sukses)
      onTutup()
    }
  }, [state])

  return (
    <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Ubah item</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kanal ditentukan ulang dari alamat link.
        </p>

        <form action={formAction} className="mt-4 space-y-3">
          <div>
            <label htmlFor="judul-ubah" className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
              Judul / caption
            </label>
            <textarea
              id="judul-ubah"
              name="judul"
              rows={4}
              required
              defaultValue={item.judul}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="url-ubah" className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
              Link
            </label>
            <input
              id="url-ubah"
              name="url"
              type="url"
              required
              defaultValue={item.url}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onTutup}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {pending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}