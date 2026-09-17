'use client'

import { useState, useEffect, useRef, useMemo, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Mustache from 'mustache'
import { ChevronLeftIcon } from '@/icons'
import { createReportFormatAction, updateReportFormatAction } from '@/app/(admin)/format-rekap/actions'
import { useToast } from '@/context/ToastProvider'
import PlatformTagInput from './PlatformTagInput'

// Preview berupa teks WhatsApp, bukan HTML, jadi escape dimatikan
// (sama dengan renderer di rekapSession.js dan monitoring.js)
Mustache.escape = (text) => text

const JENIS_REKAP = 'rekap'
const JENIS_MONITORING = 'monitoring'

// ── Data contoh: rekap link (bentuk = buildMustacheContext di rekapSession.js) ──
const DUMMY_REKAP = {
  date: 'Senin, 14 Maret 2025',
  dateRange: '1 – 14 Maret 2025',
  title: 'Kegiatan Ketahanan Pangan Polri Bersama Masyarakat',
  pejabat: 'KOMBES POL Dr. ROFIQ RIPTO HIMAWAN S.I.K., M.H.',
  count: 14,
  urls: [
    '1. https://instagram.com/p/bwi-001',
    '2. https://facebook.com/bwi-002',
    '3. https://tiktok.com/v/rjm-001',
  ],
  units: [
    {
      name: 'Polsek Banyuwangi',
      links: ['https://instagram.com/p/bwi-001', 'https://facebook.com/bwi-002'],
      platformsInUnit: [
        { platformName: 'Instagram', platformCount: 1, links: ['https://instagram.com/p/bwi-001'] },
        { platformName: 'Facebook', platformCount: 1, links: ['https://facebook.com/bwi-002'] },
      ],
    },
    {
      name: 'Polsek Genteng',
      links: ['https://instagram.com/p/gtg-001'],
      platformsInUnit: [{ platformName: 'Instagram', platformCount: 1, links: ['https://instagram.com/p/gtg-001'] }],
    },
    {
      name: 'Polsek Rogojampi',
      links: ['https://tiktok.com/v/rjm-001', 'https://instagram.com/p/rjm-002'],
      platformsInUnit: [
        { platformName: 'TikTok', platformCount: 1, links: ['https://tiktok.com/v/rjm-001'] },
        { platformName: 'Instagram', platformCount: 1, links: ['https://instagram.com/p/rjm-002'] },
      ],
    },
  ],
  platforms: [
    {
      name: 'Instagram', count: 3, number: 1, letter: 'A',
      links: ['https://instagram.com/p/bwi-001', 'https://instagram.com/p/gtg-001', 'https://instagram.com/p/rjm-002'],
      unitsInPlatform: [
        { unitName: 'Polsek Banyuwangi', links: ['https://instagram.com/p/bwi-001'] },
        { unitName: 'Polsek Genteng', links: ['https://instagram.com/p/gtg-001'] },
        { unitName: 'Polsek Rogojampi', links: ['https://instagram.com/p/rjm-002'] },
      ],
    },
    {
      name: 'Facebook', count: 1, number: 2, letter: 'B',
      links: ['https://facebook.com/bwi-002'],
      unitsInPlatform: [{ unitName: 'Polsek Banyuwangi', links: ['https://facebook.com/bwi-002'] }],
    },
    {
      name: 'TikTok', count: 1, number: 3, letter: 'C',
      links: ['https://tiktok.com/v/rjm-001'],
      unitsInPlatform: [{ unitName: 'Polsek Rogojampi', links: ['https://tiktok.com/v/rjm-001'] }],
    },
  ],
  platformsSummary: [
    { name: 'Instagram', count: 3, letter: 'A' },
    { name: 'Facebook', count: 1, letter: 'B' },
    { name: 'TikTok', count: 1, letter: 'C' },
  ],
  platformsDetailed: [
    { name: 'Instagram', number: 1, links: ['https://instagram.com/p/bwi-001', 'https://instagram.com/p/gtg-001'] },
    { name: 'Facebook', number: 2, links: ['https://facebook.com/bwi-002'] },
  ],
}

// ── Data contoh: monitoring (bentuk = generateLaporanMonitoring di monitoring.js) ──
const NAMA_KANAL = { ONLINE: 'Media Online', SOSMED: 'Media Sosial' }
const NAMA_KANAL_LAPORAN = { ONLINE: 'MEDIA ONLINE', SOSMED: 'MEDIA SOSIAL' }

const CONTOH_ITEM = {
  ONLINE: {
    POSITIF_POLRI: [
      { judul: 'Satlantas Polresta Banyuwangi Urai Kemacetan Arus Balik', url: 'https://contoh-berita.id/satlantas-urai-macet' },
      { judul: 'Polsek Genteng Ungkap Pencurian Sepeda Motor', url: 'https://contoh-berita.id/polsek-genteng-ungkap' },
    ],
    POSITIF_PEMERINTAH: [
      { judul: 'Pemkab Banyuwangi Perkuat UMKM Lewat Festival Kuliner', url: 'https://contoh-berita.id/pemkab-umkm' },
    ],
  },
  SOSMED: {
    POSITIF_POLRI: [
      { judul: 'Patroli Bhabinkamtibmas di Pasar Rogojampi', url: 'https://instagram.com/p/contoh-patroli' },
    ],
    SOSIAL_BUDAYA: [
      { judul: 'Tradisi Gandrung Sewu Kembali Digelar', url: 'https://tiktok.com/@contoh/video/1' },
    ],
  },
}

function buatDummyMonitoring({ kategori, kanalAktif, dikecualikan, tampilkanNihil }) {
  const katPakai = kategori.filter((k) => !dikecualikan.includes(k.kode))
  let totalOnline = 0
  let totalSosmed = 0

  const kanal = kanalAktif.map((kode, idx) => {
    let nomor = 0
    let total = 0
    const daftar = []
    for (const k of katPakai) {
      const isi = CONTOH_ITEM[kode]?.[k.kode] ?? []
      total += isi.length
      if (isi.length === 0 && !tampilkanNihil) continue
      nomor++
      daftar.push({ nomor, namaKategori: k.nama, nihil: isi.length === 0, jumlah: isi.length, items: isi })
    }
    if (kode === 'ONLINE') totalOnline = total
    if (kode === 'SOSMED') totalSosmed = total
    return { huruf: String.fromCharCode(65 + idx), nama: NAMA_KANAL_LAPORAN[kode] ?? kode, kategori: daftar, total }
  })

  return {
    tanggalIndo: 'Senin, 14 Maret 2025',
    tanggal: '2025-03-14',
    totalOnline,
    totalSosmed,
    totalItem: totalOnline + totalSosmed,
    pejabat: 'KOMBES POL Dr. ROFIQ RIPTO HIMAWAN S.I.K., M.H.',
    kanal,
  }
}

function renderTemplate(template, data) {
  if (!template?.trim()) return { output: '', error: null }
  try {
    return { output: Mustache.render(template, data), error: null }
  } catch (error) {
    return { output: '', error: error.message }
  }
}

// ── Chip variabel ──
const CHIP_REKAP = [
  { id: 'date', var: '{{date}}', label: '📅 Tanggal', cat: 'info', always: true },
  { id: 'dateRange', var: '{{dateRange}}', label: '📆 Rentang tanggal', cat: 'info', always: true },
  { id: 'title', var: '{{title}}', label: '📝 Judul', cat: 'info', always: true },
  { id: 'pejabat', var: '{{pejabat}}', label: '👤 Pejabat', cat: 'info', always: true },
  { id: 'count', var: '{{count}}', label: '🔢 Jumlah total', cat: 'info', needs: 'count' },
  {
    id: 'units', var: '{{#units}}\n*{{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/units}}',
    label: '🏢 Daftar per Polsek/Polres', cat: 'loop', needs: 'unit',
  },
  {
    id: 'platforms', var: '{{#platforms}}\n*{{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/platforms}}',
    label: '📱 Daftar per platform', cat: 'loop', needs: 'platform',
  },
  { id: 'urls', var: '{{#urls}}{{.}}\n{{/urls}}', label: '🔗 Semua link (tanpa grup)', cat: 'loop', always: true },
  {
    id: 'psum', var: '{{#platformsSummary}}{{letter}}. {{name}} = {{count}}\n{{/platformsSummary}}',
    label: '📊 Ringkasan platform', cat: 'sum', needs: 'platform',
  },
  {
    id: 'pdet', var: '{{#platformsDetailed}}\n*{{number}}. {{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/platformsDetailed}}',
    label: '📋 Detail platform dan link', cat: 'sum', needs: 'platform',
  },
  {
    id: 'unitsPlatform',
    var: '{{#units}}\n*{{name}}*\n{{#platformsInUnit}}{{platformName}} : {{platformCount}}\n{{#links}}{{.}}\n{{/links}}\n{{/platformsInUnit}}\n{{/units}}',
    label: '🏢📱 Unit → Platform', cat: 'loop', needs: 'both',
  },
  {
    id: 'platformsUnit',
    var: '{{#platforms}}\n*{{name}}* : {{count}}\n{{#unitsInPlatform}}\n*{{unitName}}*\n{{#links}}{{.}}\n{{/links}}\n{{/unitsInPlatform}}\n{{/platforms}}',
    label: '📱🏢 Platform → Unit', cat: 'loop', needs: 'both',
  },
]

const CHIP_MONITORING = [
  { id: 'tanggalIndo', var: '{{tanggalIndo}}', label: '📅 Tanggal lengkap', cat: 'info', always: true },
  { id: 'tanggal', var: '{{tanggal}}', label: '📆 Tanggal (TTTT-BB-HH)', cat: 'info', always: true },
  { id: 'pejabat', var: '{{pejabat}}', label: '👤 Pejabat', cat: 'info', always: true },
  { id: 'totalOnline', var: '{{totalOnline}}', label: '🌐 Total media online', cat: 'info', always: true },
  { id: 'totalSosmed', var: '{{totalSosmed}}', label: '📱 Total media sosial', cat: 'info', always: true },
  { id: 'totalItem', var: '{{totalItem}}', label: '🔢 Total seluruh item', cat: 'info', always: true },
  {
    id: 'kanalLengkap',
    var: '{{#kanal}}\n*{{huruf}}. {{nama}}*\n{{#kategori}}\n{{nomor}}. {{namaKategori}}{{#nihil}} : NIHIL{{/nihil}}\n{{#items}}\n- {{judul}}\n{{url}}\n{{/items}}\n{{/kategori}}\n\n{{/kanal}}',
    label: '📰 Kanal → kategori → berita', cat: 'loop', always: true,
  },
  {
    id: 'kanalRingkas',
    var: '{{#kanal}}\n*{{huruf}}. {{nama}}* : {{total}}\n{{#kategori}}{{nomor}}. {{namaKategori}} : {{jumlah}}\n{{/kategori}}\n{{/kanal}}',
    label: '📊 Ringkasan jumlah per kategori', cat: 'sum', always: true,
  },
  {
    id: 'nihilBlok',
    var: '{{#nihil}}NIHIL{{/nihil}}{{^nihil}}{{jumlah}} berita{{/nihil}}',
    label: '⚪ Blok nihil / ada isi', cat: 'sum', always: true,
    hint: 'Gunakan di dalam blok {{#kategori}}',
  },
]

const CAT_CLASS = {
  info: 'bg-blue-light-50 dark:bg-blue-light-500/15 text-blue-light-700 dark:text-blue-light-400 border-blue-light-200 dark:border-blue-light-800',
  loop: 'bg-success-50 dark:bg-success-500/15 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800',
  sum: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white'

const initialState = { error: null, success: false }

function jenisDari(config) {
  return config?.jenis === JENIS_MONITORING ? JENIS_MONITORING : JENIS_REKAP
}

export default function TemplateEditor({
  mode = 'create',
  initialData = null,
  nextId = '',
  availablePlatforms = [],
  kategoriMonitoring = [],
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const taRef = useRef(null)
  const dragVarRef = useRef(null)

  const isEdit = mode === 'edit'
  const config = initialData?.config ?? {}
  const jenisAwal = jenisDari(config)
  const totalSesi = initialData?.totalSesi ?? 0
  const jenisTerkunci = isEdit && totalSesi > 0

  // ── Data umum ──
  const [jenis, setJenis] = useState(jenisAwal)
  const [name, setName] = useState(
    mode === 'duplicate' ? `${initialData?.name || ''} (Duplikat)` : initialData?.name || ''
  )
  const [desc, setDesc] = useState(initialData?.description || '')
  const [template, setTemplate] = useState(initialData?.template || '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)

  // ── Konfigurasi rekap ──
  // Nama platform lama disamakan dengan master (beda huruf besar/kecil)
  const [platforms, setPlatforms] = useState(() => {
    const peta = new Map(availablePlatforms.map((p) => [p.name.toLowerCase(), p.name]))
    const awal = Array.isArray(config.requiredPlatform) ? config.requiredPlatform : []
    return [...new Set(awal.map((n) => peta.get(String(n).toLowerCase()) ?? n))]
  })
  const [reqFields, setReqFields] = useState({
    title: config.requiredFields?.includes('title') ?? false,
    links: config.requiredFields?.includes('links') ?? true,
    dateRange: config.requiredFields?.includes('dateRange') ?? false,
  })
  const [cfg, setCfg] = useState({
    hasUnit: config.hasUnit ?? false,
    hasCount: config.hasCount ?? false,
    countByPlatform: config.countByPlatform ?? false,
    groupBy: config.groupBy ?? '',
    unitScope: config.unitScope ?? 'POLSEK',
    platformListStyle: config.platformListStyle ?? 'simple',
    shuffle: config.shuffle ?? false,
    sortByPriority: config.sortByPriority ?? false,
  })

  // ── Konfigurasi monitoring ──
  // Urutan kanal menentukan huruf A/B di laporan
  const [kanalUrutan, setKanalUrutan] = useState(() => {
    const aktif = Array.isArray(config.kanalAktif) ? config.kanalAktif.filter((k) => k in NAMA_KANAL) : []
    return [...new Set([...aktif, 'ONLINE', 'SOSMED'])]
  })
  const [kanalNonaktif, setKanalNonaktif] = useState(() => {
    const aktif = Array.isArray(config.kanalAktif) ? config.kanalAktif : []
    return aktif.length ? Object.keys(NAMA_KANAL).filter((k) => !aktif.includes(k)) : []
  })
  const [tampilkanNihil, setTampilkanNihil] = useState(config.tampilkanNihil !== false)
  const [dikecualikan, setDikecualikan] = useState(
    Array.isArray(config.kategoriDikecualikan) ? config.kategoriDikecualikan : []
  )

  const [validationError, setValidationError] = useState(null)

  const action = isEdit ? updateReportFormatAction.bind(null, initialData.id) : createReportFormatAction
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast(
        isEdit ? 'Format berhasil diperbarui' : `Format berhasil ditambahkan dengan ID ${state.id}`,
        'success'
      )
      router.push('/format-rekap')
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

  const isMonitoring = jenis === JENIS_MONITORING
  const kanalAktif = kanalUrutan.filter((k) => !kanalNonaktif.includes(k))

  // ── Konfigurasi rekap: toggle ──
  const updateCfg = (key, val) => setCfg((prev) => ({ ...prev, [key]: val }))

  const togCfg = (key) => {
    setCfg((prev) => {
      const newVal = !prev[key]
      const next = { ...prev, [key]: newVal }
      if (key === 'hasUnit') next.groupBy = newVal ? 'unit' : prev.countByPlatform ? 'platform' : ''
      if (key === 'countByPlatform') {
        if (newVal) next.groupBy = 'platform'
        else if (prev.hasUnit) next.groupBy = 'unit'
        else next.groupBy = ''
      }
      return next
    })
  }

  // ── Konfigurasi monitoring: aksi ──
  const togKanal = (kode) =>
    setKanalNonaktif((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  const tukarKanal = () => setKanalUrutan((prev) => [...prev].reverse())
  const togKategori = (kode) =>
    setDikecualikan((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))

  // ── Chip ──
  const chips = isMonitoring ? CHIP_MONITORING : CHIP_REKAP

  const isChipEnabled = (chip) => {
    if (chip.always) return true
    const perPlatform = cfg.groupBy === 'platform' || cfg.countByPlatform
    if (chip.needs === 'unit') return cfg.hasUnit
    if (chip.needs === 'platform') return perPlatform
    if (chip.needs === 'count') return cfg.hasCount
    if (chip.needs === 'both') return cfg.hasUnit && perPlatform
    return true
  }

  const insertAtCursor = (text) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const en = ta.selectionEnd
    setTemplate(template.slice(0, s) + text + template.slice(en))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + text.length, s + text.length)
    })
  }

  const handleChipDragStart = (e, chip) => {
    if (!isChipEnabled(chip)) { e.preventDefault(); return }
    dragVarRef.current = chip.var
    e.dataTransfer.effectAllowed = 'copy'
  }
  const handleTaDragOver = (e) => {
    e.preventDefault()
    taRef.current?.classList.add('ring-2', 'ring-brand-400')
  }
  const handleTaDragLeave = () => taRef.current?.classList.remove('ring-2', 'ring-brand-400')
  const handleTaDrop = (e) => {
    e.preventDefault()
    taRef.current?.classList.remove('ring-2', 'ring-brand-400')
    if (!dragVarRef.current) return
    insertAtCursor(dragVarRef.current)
    dragVarRef.current = null
  }

  // ── Preview ──
  const dataPreview = useMemo(
    () =>
      isMonitoring
        ? buatDummyMonitoring({ kategori: kategoriMonitoring, kanalAktif, dikecualikan, tampilkanNihil })
        : DUMMY_REKAP,
    // kanalAktif diturunkan dari dua state di bawah
    [isMonitoring, kategoriMonitoring, kanalUrutan, kanalNonaktif, dikecualikan, tampilkanNihil]
  )
  const { output: preview, error: previewError } = renderTemplate(template, dataPreview)

  const namaMaster = useMemo(() => new Set(availablePlatforms.map((p) => p.name)), [availablePlatforms])

  // ── Validasi client (cermin validasi Model; Model tetap sumber kebenaran) ──
  const handleSubmit = (e) => {
    const warnings = []

    if (!name.trim()) warnings.push('Nama format wajib diisi.')
    if (!template.trim()) warnings.push('Template wajib diisi.')
    if (desc.trim().length > 191) warnings.push('Deskripsi maksimal 191 karakter.')

    if (isMonitoring) {
      if (kanalAktif.length === 0) warnings.push('Pilih minimal satu kanal.')
    } else {
      const hasTitle = template.includes('{{title}}')
      const hasDateRange = template.includes('{{dateRange}}')
      const tidakTerdaftar = platforms.filter((p) => !namaMaster.has(p))

      if (platforms.length === 0) warnings.push('Pilih minimal satu platform.')
      if (tidakTerdaftar.length) warnings.push(`Platform tidak terdaftar di master: ${tidakTerdaftar.join(', ')}.`)
      if (hasTitle && !reqFields.title) warnings.push('Template menggunakan {{title}}, tetapi "Judul" belum ditandai wajib diisi.')
      if (reqFields.title && !hasTitle) warnings.push('"Judul" ditandai wajib diisi, tetapi {{title}} tidak ada di template.')
      if (hasDateRange && !reqFields.dateRange) warnings.push('Template menggunakan {{dateRange}}, tetapi "Rentang tanggal" belum ditandai wajib diisi.')
      if (reqFields.dateRange && !hasDateRange) warnings.push('"Rentang tanggal" ditandai wajib diisi, tetapi {{dateRange}} tidak ada di template.')
    }

    if (previewError) warnings.push(`Template tidak valid: ${previewError}`)

    if (warnings.length > 0) {
      // React 19: action tidak dijalankan kalau event sudah di-preventDefault
      e.preventDefault()
      setValidationError(warnings.join('\n'))
      return
    }
    setValidationError(null)
  }

  const configPayload = isMonitoring
    ? { jenis: JENIS_MONITORING, kanalAktif, tampilkanNihil, kategoriDikecualikan: dikecualikan }
    : {
        jenis: JENIS_REKAP,
        ...cfg,
        requiredPlatform: platforms,
        requiredFields: Object.entries(reqFields).filter(([, v]) => v).map(([k]) => k),
      }

  const idTampil = isEdit ? initialData.id : nextId

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="fixed inset-0 z-999999 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950"
    >
      {/* ── Topbar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/format-rekap')}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeftIcon className="size-4" /> Kembali
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isEdit ? 'Ubah Format' : mode === 'duplicate' ? 'Duplikat Format' : 'Tambah Format Baru'}
            </h1>
            <p className="text-xs text-gray-400">{name || 'Format baru'}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Format'}
        </button>
      </div>

      {/* ── Strip meta ── */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 grid grid-cols-[9rem_auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">ID FORMAT</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
              {idTampil || '—'}
            </div>
            {!isEdit && (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Ditetapkan otomatis saat disimpan</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">JENIS FORMAT</p>
            <div
              className={`inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${jenisTerkunci ? 'opacity-60' : ''}`}
              title={jenisTerkunci ? `Tidak dapat diubah karena digunakan oleh ${totalSesi} sesi rekap` : undefined}
            >
              {[[JENIS_REKAP, 'Rekap Link'], [JENIS_MONITORING, 'Monitoring']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  disabled={jenisTerkunci}
                  onClick={() => setJenis(val)}
                  className={`px-3 py-2 text-xs disabled:cursor-not-allowed ${
                    jenis === val
                      ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            {jenisTerkunci ? (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Digunakan oleh {totalSesi} sesi rekap</p>
            ) : isEdit && jenis !== jenisAwal ? (
              <p className="mt-1 text-[11px] text-warning-600 dark:text-warning-400">Sesuaikan template dengan variabel jenis ini</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="fr-name" className="mb-1 block text-xs font-medium text-gray-400 dark:text-gray-500">NAMA FORMAT *</label>
            <input id="fr-name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rekap Amplifikasi Harian" className={INPUT_CLASS} />
          </div>

          <div>
            <label htmlFor="fr-desc" className="mb-1 block text-xs font-medium text-gray-400 dark:text-gray-500">DESKRIPSI</label>
            <input id="fr-desc" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={191} placeholder="Penjelasan singkat penggunaan format" className={INPUT_CLASS} />
          </div>

          <div className="pt-7">
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                name="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              {isMonitoring ? 'Aktif' : 'Aktif (dapat dipilih di bot)'}
            </label>
          </div>
        </div>

        {isMonitoring ? (
          <div className="flex items-start gap-6">
            <div className="w-56 shrink-0">
              <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">KANAL DAN URUTAN *</p>
              <div className="space-y-1">
                {kanalUrutan.map((kode, i) => {
                  const aktif = !kanalNonaktif.includes(kode)
                  const huruf = aktif ? `${String.fromCharCode(65 + kanalAktif.indexOf(kode))}. ` : ''
                  return (
                    <div key={kode} className="flex items-center justify-between rounded-lg border border-gray-200 px-2.5 py-1.5 dark:border-gray-700">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={aktif} onChange={() => togKanal(kode)} className="size-3 accent-brand-500" />
                        <span className={aktif ? '' : 'text-gray-400 line-through'}>{huruf}{NAMA_KANAL[kode]}</span>
                      </label>
                      <button
                        type="button"
                        onClick={tukarKanal}
                        title={i === 0 ? 'Pindahkan ke bawah' : 'Pindahkan ke atas'}
                        className="px-1 text-xs text-gray-400 hover:text-brand-500"
                      >
                        {i === 0 ? '↓' : '↑'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2">
                <ToggleItem label="Tampilkan kategori nihil" active={tampilkanNihil} onToggle={() => setTampilkanNihil((v) => !v)} />
              </div>
            </div>

            <div className="h-full w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700" />

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                KATEGORI YANG DICETAK <span className="font-normal">— klik untuk mengecualikan</span>
              </p>
              {kategoriMonitoring.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada kategori monitoring yang aktif.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {kategoriMonitoring.map((k) => {
                    const keluar = dikecualikan.includes(k.kode)
                    return (
                      <button
                        key={k.kode}
                        type="button"
                        onClick={() => togKategori(k.kode)}
                        aria-pressed={!keluar}
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          keluar
                            ? 'border border-dashed border-gray-300 text-gray-400 line-through dark:border-gray-600'
                            : 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
                        }`}
                      >
                        {k.nama}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span className="shrink-0 pt-2.5 text-xs font-medium text-gray-400 dark:text-gray-500">PLATFORM *</span>
              <PlatformTagInput options={availablePlatforms} value={platforms} onChange={setPlatforms} />
            </div>

            <div className="h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-700" />

            <div className="flex shrink-0 items-center gap-1 pt-2">
              <span className="mr-2 text-xs font-medium text-gray-400 dark:text-gray-500">WAJIB DIISI PENGGUNA</span>
              {[['title', 'Judul'], ['links', 'Link'], ['dateRange', 'Rentang tanggal']].map(([k, lbl]) => (
                <label key={k} className="mr-2 flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={reqFields[k]}
                    onChange={() => setReqFields((prev) => ({ ...prev, [k]: !prev[k] }))}
                    className="size-3 accent-brand-500"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{lbl}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto px-3 py-2">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Variabel →</span>
          {chips.map((chip) => {
            const enabled = isChipEnabled(chip)
            return (
              <div
                key={chip.id}
                draggable={enabled}
                onDragStart={(e) => handleChipDragStart(e, chip)}
                onClick={() => enabled && insertAtCursor(chip.var)}
                title={enabled ? (chip.hint ?? 'Klik atau seret ke editor') : 'Aktifkan konfigurasi terkait terlebih dahulu'}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-opacity select-none ${CAT_CLASS[chip.cat]} ${enabled ? 'cursor-grab opacity-100 hover:brightness-95' : 'cursor-not-allowed opacity-30'}`}
              >
                {chip.label}
              </div>
            )
          })}
        </div>

        {!isMonitoring && (
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
            <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Konfigurasi →</span>

            <ToggleItem label="Per unit" active={cfg.hasUnit} onToggle={() => togCfg('hasUnit')} />
            {cfg.hasUnit && (
              <select value={cfg.unitScope} onChange={(e) => updateCfg('unitScope', e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <option value="POLSEK">POLSEK</option>
                <option value="POLRES">POLRES</option>
              </select>
            )}

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <ToggleItem label="Per platform" active={cfg.countByPlatform} onToggle={() => togCfg('countByPlatform')} />

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <ToggleItem label="Tampilkan jumlah" active={cfg.hasCount} onToggle={() => togCfg('hasCount')} />
            {cfg.hasCount && cfg.countByPlatform && (
              <select value={cfg.platformListStyle} onChange={(e) => updateCfg('platformListStyle', e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <option value="simple">Gaya sederhana</option>
                <option value="summary_first">Ringkasan terlebih dahulu, lalu rincian</option>
              </select>
            )}

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <ToggleItem label="Acak urutan link" active={cfg.shuffle} onToggle={() => togCfg('shuffle')} />

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <ToggleItem label="Utamakan link prioritas" active={cfg.sortByPriority} onToggle={() => togCfg('sortByPriority')} />
          </div>
        )}
      </div>

      {validationError && (
        <div className="shrink-0 border-b border-error-200 bg-error-50 px-4 py-2 text-sm whitespace-pre-line text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
          {validationError}
        </div>
      )}

      {/* ── Editor | Preview ── */}
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
            TEMPLATE — seret variabel dari toolbar, atau klik dan ketik langsung
          </div>
          <textarea
            ref={taRef}
            name="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            onDragOver={handleTaDragOver}
            onDragLeave={handleTaDragLeave}
            onDrop={handleTaDrop}
            placeholder="Mulai mengetik atau seret variabel dari toolbar di atas..."
            className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-white p-4 font-mono text-xs leading-relaxed text-gray-900 outline-none placeholder-gray-300 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-700"
          />
        </div>

        <div className="flex min-h-0 flex-col bg-gray-50 dark:bg-gray-900">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              PRATINJAU {isMonitoring ? 'LAPORAN MONITORING' : 'LAPORAN REKAP'}
            </span>
            <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs text-success-700 dark:bg-success-500/15 dark:text-success-400">● Langsung</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!template.trim() ? (
              <p className="mt-12 text-center text-xs text-gray-300 dark:text-gray-600">
                Mulai mengetik atau seret variabel untuk melihat pratinjau.
              </p>
            ) : previewError ? (
              <p className="text-xs text-error-600 dark:text-error-400">Template tidak valid: {previewError}</p>
            ) : (
              <pre className="font-sans text-xs leading-relaxed wrap-break-word whitespace-pre-wrap text-gray-800 dark:text-gray-200">{preview}</pre>
            )}
          </div>
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600">
            Data contoh · pratinjau diperbarui otomatis
          </div>
        </div>
      </div>

      <input type="hidden" name="config" value={JSON.stringify(configPayload)} />
    </form>
  )
}

function ToggleItem({ label, active, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active} className="inline-flex cursor-pointer items-center gap-1.5">
      <span className={`relative h-4 w-7 rounded-full transition-colors ${active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${active ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </button>
  )
}