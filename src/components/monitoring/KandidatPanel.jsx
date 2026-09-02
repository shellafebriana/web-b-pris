'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastProvider'
import { ambilKandidatAction, tolakKandidatAction } from '@/app/(admin)/monitoring/actions'

function jamWib(iso) {
  if (!iso) return null
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}.${p(d.getUTCMinutes())}`
}

export default function KandidatPanel({ data, kategori, pagination, kanalAktif }) {
  const { showToast } = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [menarik, setMenarik] = useState(false)
  const [pilihan, setPilihan] = useState(() => new Set())
  const [kategoriPilihan, setKategoriPilihan] = useState({})
  const [kategoriMassal, setKategoriMassal] = useState('')
    const [kemajuan, setKemajuan] = useState(null)

  const petaKode = new Map(kategori.map((k) => [k.kode, k]))

  function toggle(id) {
    setPilihan((lama) => {
      const baru = new Set(lama)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }

  const semuaTercentang = data.length > 0 && data.every((k) => pilihan.has(k.id))

  function toggleSemua() {
    setPilihan(semuaTercentang ? new Set() : new Set(data.map((k) => k.id)))
  }

  // Kategori massal hanya menimpa yang TERCENTANG, bukan semua baris.
  function terapkanMassal(kode) {
    setKategoriMassal(kode)
    if (!kode) return
    setKategoriPilihan((s) => {
      const baru = { ...s }
      for (const id of pilihan) baru[id] = kode
      return baru
    })
  }

    async function tarikSekarang() {
    setMenarik(true)
    setKemajuan('menyiapkan...')
    let totalBaru = 0
    let gagal = 0
    try {
      const daftar = await (await fetch('/api/monitoring/tarik')).json()
      const sumber = daftar.sumber ?? []
      if (sumber.length === 0) {
        showToast('Belum ada sumber aktif. Isi dulu tabel sumber.', 'error')
        return
      }

      // Berurutan, satu sumber per permintaan — supaya tiap panggilan pendek
      // dan tidak kena batas waktu serverless (504).
      for (let i = 0; i < sumber.length; i++) {
        setKemajuan(`${i + 1}/${sumber.length} — ${sumber[i].nama}`)
        try {
          const r = await fetch(`/api/monitoring/tarik?id=${sumber[i].id}`, { method: 'POST' })
          if (!r.ok) { gagal++; continue }
          const h = await r.json()
          totalBaru += h.baru ?? 0
        } catch {
          gagal++
        }
      }

      showToast(
        `${totalBaru} kandidat baru dari ${sumber.length - gagal} sumber` +
          (gagal ? `, ${gagal} sumber gagal` : ''),
        gagal === sumber.length ? 'error' : 'success'
      )
      router.refresh()
    } catch {
      showToast('Gagal menarik. Cek koneksi lalu coba lagi.', 'error')
    } finally {
      setMenarik(false)
      setKemajuan(null)
    }
  }

  function tambahkan() {
    const daftar = [...pilihan]
    startTransition(async () => {
      const r = await ambilKandidatAction(daftar, kategoriPilihan)
      if (r?.error) return showToast(r.error, 'error')
      showToast(
        `${r.masuk} item masuk ke sesi hari ini` + (r.duplikat ? `, ${r.duplikat} sudah ada` : ''),
        'success'
      )
      setPilihan(new Set())
      router.refresh()
    })
  }

  function tolak() {
    const daftar = [...pilihan]
    startTransition(async () => {
      const r = await tolakKandidatAction(daftar)
      if (r?.error) return showToast(r.error, 'error')
      showToast(`${daftar.length} kandidat disingkirkan`, 'success')
      setPilihan(new Set())
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {[
            { kode: null, label: 'Semua' },
            { kode: 'ONLINE', label: 'Media Online' },
            { kode: 'SOSMED', label: 'Media Sosial' },
          ].map((k) => (
            <Link
              key={k.label}
              href={k.kode ? `/monitoring/kandidat?kanal=${k.kode}` : '/monitoring/kandidat'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                kanalAktif === k.kode
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {k.label}
            </Link>
          ))}
        </div>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {pagination.total} menunggu
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={tarikSekarang}
            disabled={menarik || pending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {menarik ? (kemajuan ?? 'Menarik...') : 'Tarik sekarang'}
          </button>
          {pilihan.size > 0 ? (
            <>
              <button
                type="button"
                onClick={tolak}
                disabled={pending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
              >
                Singkirkan ({pilihan.size})
              </button>
              <button
                type="button"
                onClick={tambahkan}
                disabled={pending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {pending ? 'Menyimpan...' : `Tambah ${pilihan.size} ke hari ini`}
              </button>
            </>
          ) : null}
        </div>
      </div>
      
      {data.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={semuaTercentang}
              onChange={toggleSemua}
              className="size-4 accent-brand-500"
            />
            Centang semua di halaman ini ({data.length})
          </label>

          {pilihan.size > 0 ? (
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Kategori untuk {pilihan.size} terpilih:
              <select
                value={kategoriMassal}
                onChange={(e) => terapkanMassal(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="">Pakai saran sistem</option>
                {kategori.map((kat) => (
                  <option key={kat.id} value={kat.kode}>
                    {kat.sortOrder}. {kat.nama}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {data.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Antrean kosong. Tekan &quot;Tarik sekarang&quot; untuk mengambil berita terbaru.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((k) => {
              const saran = k.saranKode ? petaKode.get(k.saranKode) : null
              const ragu = !saran || (k.confidence ?? 0) < 60
              return (
                <div
                  key={k.id}
                  className={`flex gap-3 px-5 py-3.5 ${ragu ? 'bg-warning-50/40 dark:bg-warning-500/5' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={pilihan.has(k.id)}
                    onChange={() => toggle(k.id)}
                    aria-label={`Pilih ${k.judul}`}
                    className="mt-1 size-4 flex-none accent-brand-500"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-white/90">{k.judul}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                      {k.sudahResolve ? (
                        <a
                          href={k.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {k.sumberNama}
                        </a>
                      ) : (
                        <span
                          className="text-gray-500 dark:text-gray-400"
                          title="Link asli dipulihkan saat item ditambahkan"
                        >
                          {k.sumberNama}
                        </span>
                      )}
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-gray-400 dark:text-gray-500">
                        {{ GNEWS: 'Google News', IG: 'Instagram', IGBD: 'Instagram' }[k.jenisSumber] ?? 'RSS'}
                        {k.terbitAt ? ` · ${jamWib(k.terbitAt)}` : ''}
                      </span>
                      {k.domainBaru ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          domain baru
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          k.kanal === 'SOSMED'
                            ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400'
                            : 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15'
                        }`}
                      >
                        {k.kanal === 'SOSMED' ? 'Sosmed' : 'Online'}
                      </span>

                      <select
                        value={kategoriPilihan[k.id] ?? k.saranKode ?? ''}
                        onChange={(e) =>
                          setKategoriPilihan((s) => ({ ...s, [k.id]: e.target.value }))
                        }
                        className="ml-auto rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <option value="">Pilih kategori</option>
                        {kategori.map((kat) => (
                          <option key={kat.id} value={kat.kode}>
                            {kat.sortOrder}. {kat.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {pagination.totalPage > 1 ? (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Halaman {pagination.page} dari {pagination.totalPage} · {pagination.total} kandidat
              </span>
              <div className="flex gap-2">
                {pagination.page > 1 ? (
                  <Link
                    href={`/monitoring/kandidat?page=${pagination.page - 1}${kanalAktif ? `&kanal=${kanalAktif}` : ''}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-300"
                  >
                    Sebelumnya
                  </Link>
                ) : null}
                {pagination.page < pagination.totalPage ? (
                  <Link
                    href={`/monitoring/kandidat?page=${pagination.page + 1}${kanalAktif ? `&kanal=${kanalAktif}` : ''}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-300"
                  >
                    Berikutnya
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}