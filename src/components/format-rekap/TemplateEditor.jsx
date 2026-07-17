'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import Mustache from 'mustache'
import { ChevronLeftIcon } from '@/icons'
import { createReportFormatAction, updateReportFormatAction } from '@/app/(admin)/format-rekap/actions'
import { useToast } from '@/context/ToastProvider'

// Mustache defaultnya escape HTML entities — kita matiin karena ini preview
// pesan WhatsApp (plain text), bukan HTML
Mustache.escape = (text) => text

// ── Data contoh buat live preview ──
const DUMMY = {
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

function renderTemplate(template) {
  if (!template?.trim()) return { output: '', error: null }
  try {
    return { output: Mustache.render(template, DUMMY), error: null }
  } catch (error) {
    return { output: '', error: error.message }
  }
}

// ── Chip variabel ──
function makeChips(cfg) {
  return [
    { id: 'date', var: '{{date}}', label: '📅 Tanggal', cat: 'info', always: true },
    { id: 'dateRange', var: '{{dateRange}}', label: '📆 Rentang tanggal', cat: 'info', always: true },
    { id: 'title', var: '{{title}}', label: '📝 Judul', cat: 'info', always: true },
    { id: 'pejabat', var: '{{pejabat}}', label: '👤 Pejabat', cat: 'info', always: true },
    { id: 'count', var: '{{count}}', label: '🔢 Jumlah total', cat: 'info', always: false, needs: 'count' },
    {
      id: 'units', var: '{{#units}}\n*{{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/units}}',
      label: '🏢 Daftar per Polsek/Polres', cat: 'loop', always: false, needs: 'unit',
    },
    {
      id: 'platforms', var: '{{#platforms}}\n*{{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/platforms}}',
      label: '📱 Daftar per Platform', cat: 'loop', always: false, needs: 'platform',
    },
    { id: 'urls', var: '{{#urls}}{{.}}\n{{/urls}}', label: '🔗 Semua link (tanpa grup)', cat: 'loop', always: true },
    {
      id: 'psum', var: '{{#platformsSummary}}{{letter}}. {{name}} = {{count}}\n{{/platformsSummary}}',
      label: '📊 Ringkasan platform', cat: 'sum', always: false, needs: 'platform',
    },
    {
      id: 'pdet', var: '{{#platformsDetailed}}\n*{{number}}. {{name}}*\n{{#links}}{{.}}\n{{/links}}\n{{/platformsDetailed}}',
      label: '📋 Detail platform + link', cat: 'sum', always: false, needs: 'platform',
    },
    {
      id: 'unitsPlatform',
      var: '{{#units}}\n*{{name}}*\n{{#platformsInUnit}}{{platformName}} : {{platformCount}}\n{{#links}}{{.}}\n{{/links}}\n{{/platformsInUnit}}\n{{/units}}',
      label: '🏢📱 Unit → Platform', cat: 'loop', always: false, needs: 'both',
    },
    {
      id: 'platformsUnit',
      var: '{{#platforms}}\n*{{name}}* : {{count}}\n{{#unitsInPlatform}}\n*{{unitName}}*\n{{#links}}{{.}}\n{{/links}}\n{{/unitsInPlatform}}\n{{/platforms}}',
      label: '📱🏢 Platform → Unit', cat: 'loop', always: false, needs: 'both',
    },
  ]
}

const CAT_CLASS = {
  info: 'bg-blue-light-50 dark:bg-blue-light-500/15 text-blue-light-700 dark:text-blue-light-400 border-blue-light-200 dark:border-blue-light-800',
  loop: 'bg-success-50 dark:bg-success-500/15 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800',
  sum: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
}

const initialState = { error: null, success: false }

export default function TemplateEditor({ mode = 'create', initialData = null, availablePlatforms = [] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const taRef = useRef(null)
  const dragVarRef = useRef(null)

  const [formatId, setFormatId] = useState(mode === 'edit' ? initialData?.id || '' : '')
  const [name, setName] = useState(
    mode === 'duplicate' ? `${initialData?.name || ''} (Duplikat)` : initialData?.name || ''
  )
  const [desc, setDesc] = useState(initialData?.description || '')
  const [template, setTemplate] = useState(initialData?.template || '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [platforms, setPlatforms] = useState(initialData?.config?.requiredPlatform || [])
  const [reqFields, setReqFields] = useState({
    title: initialData?.config?.requiredFields?.includes('title') ?? false,
    links: initialData?.config?.requiredFields?.includes('links') ?? true,
    dateRange: initialData?.config?.requiredFields?.includes('dateRange') ?? false,
  })
  const [cfg, setCfg] = useState({
    hasUnit: initialData?.config?.hasUnit ?? false,
    hasCount: initialData?.config?.hasCount ?? false,
    countByPlatform: initialData?.config?.countByPlatform ?? false,
    groupBy: initialData?.config?.groupBy ?? '',
    unitScope: initialData?.config?.unitScope ?? 'POLSEK',
    platformListStyle: initialData?.config?.platformListStyle ?? 'simple',
    shuffle: initialData?.config?.shuffle ?? false,
    sortByPriority: initialData?.config?.sortByPriority ?? false,
  })

  const [ptInput, setPtInput] = useState('')
  const [sugOpen, setSugOpen] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const action = mode === 'edit' ? updateReportFormatAction.bind(null, formatId) : createReportFormatAction
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.success) {
      showToast(mode === 'edit' ? 'Format berhasil diperbarui' : 'Format berhasil ditambahkan', 'success')
      router.push('/format-rekap')
    } else if (state?.error) {
      showToast(state.error, 'error')
    }
  }, [state])

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

  const isChipEnabled = (chip) => {
    if (chip.always) return true
    if (chip.needs === 'unit') return cfg.hasUnit
    if (chip.needs === 'platform') return cfg.groupBy === 'platform' || cfg.countByPlatform
    if (chip.needs === 'count') return cfg.hasCount
    if (chip.needs === 'both') return cfg.hasUnit && (cfg.groupBy === 'platform' || cfg.countByPlatform)
    return true
  }

  const insertAtCursor = (text) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const en = ta.selectionEnd
    const newVal = template.slice(0, s) + text + template.slice(en)
    setTemplate(newVal)
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

  const remaining = availablePlatforms.filter(
    (p) => !platforms.includes(p) && p.toLowerCase().includes(ptInput.toLowerCase())
  )
  const addPlatform = (p) => { if (!platforms.includes(p)) setPlatforms((prev) => [...prev, p]); setPtInput(''); setSugOpen(false) }
  const removePlatform = (p) => setPlatforms((prev) => prev.filter((x) => x !== p))
  const handlePtKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = ptInput.trim().replace(',', '')
      if (v) addPlatform(v)
    }
    if (e.key === 'Escape') setSugOpen(false)
  }

  const handleSubmit = (e) => {
    const templateHasTitle = template.includes('{{title}}')
    const templateHasDateRange = template.includes('{{dateRange}}')
    const warnings = []

    if (mode !== 'edit' && !formatId.trim()) warnings.push('ID format wajib diisi')
    if (!name.trim()) warnings.push('Nama format wajib diisi')
    if (!template.trim()) warnings.push('Template wajib diisi')
    if (platforms.length === 0) warnings.push('Minimal 1 platform wajib dipilih')
    if (templateHasTitle && !reqFields.title) warnings.push('Template pakai {{title}} tapi "Judul" belum dicentang di Wajib User')
    if (reqFields.title && !templateHasTitle) warnings.push('"Judul" dicentang wajib, tapi {{title}} gak ada di template')
    if (templateHasDateRange && !reqFields.dateRange) warnings.push('Template pakai {{dateRange}} tapi "Rentang tgl" belum dicentang')
    if (reqFields.dateRange && !templateHasDateRange) warnings.push('"Rentang tgl" dicentang wajib, tapi {{dateRange}} gak ada di template')

    const { error: renderError } = renderTemplate(template)
    if (renderError) warnings.push(`Template error: ${renderError}`)

    if (warnings.length > 0) {
      e.preventDefault()
      setValidationError(warnings.join('\n'))
      return
    }
    setValidationError(null)
  }

  const chips = makeChips(cfg)
  const { output: preview, error: previewError } = renderTemplate(template)

  const configPayload = {
    ...cfg,
    requiredPlatform: platforms,
    requiredFields: Object.entries(reqFields).filter(([, v]) => v).map(([k]) => k),
  }

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
              {mode === 'edit' ? 'Edit format' : mode === 'duplicate' ? 'Duplikat format' : 'Buat format baru'}
            </h1>
            <p className="text-xs text-gray-400">{name || 'Format baru'}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? 'Menyimpan...' : 'Simpan format'}
        </button>
      </div>

      {/* ── Meta strip ── */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 grid grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 dark:text-gray-500">ID FORMAT *</label>
            <input
              name="id"
              value={formatId}
              onChange={(e) => setFormatId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="contoh: format9"
              disabled={mode === 'edit'}
              className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${mode === 'edit' ? 'cursor-not-allowed opacity-50' : ''}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 dark:text-gray-500">NAMA FORMAT *</label>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama format..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 dark:text-gray-500">DESKRIPSI</label>
            <input
              name="description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Penjelasan singkat..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                name="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Aktif (bisa dipilih di bot)
            </label>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">PLATFORM *</span>
            <div className="flex flex-1 cursor-text flex-wrap items-center gap-1.5" onClick={() => document.getElementById('pt-inp')?.focus()}>
              {platforms.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs text-success-700 dark:bg-success-500/15 dark:text-success-400">
                  {p}
                  <button type="button" onClick={() => removePlatform(p)} className="leading-none text-success-600 hover:text-error-500 dark:text-success-400">×</button>
                </span>
              ))}
              <div className="relative">
                <input
                  id="pt-inp"
                  value={ptInput}
                  onChange={(e) => { setPtInput(e.target.value); setSugOpen(true) }}
                  onFocus={() => setSugOpen(true)}
                  onKeyDown={handlePtKey}
                  placeholder={platforms.length ? '' : 'Cari platform...'}
                  className="min-w-25 bg-transparent text-xs text-gray-900 placeholder-gray-300 outline-none dark:text-white dark:placeholder-gray-600"
                />
                {sugOpen && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {remaining.length > 0 ? (
                      remaining.map((p) => (
                        <button key={p} type="button" onMouseDown={() => addPlatform(p)} className="w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                          {p}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-gray-400">Semua sudah dipilih</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />

          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 text-xs font-medium text-gray-400 dark:text-gray-500">WAJIB USER</span>
            {[['title', 'Judul'], ['links', 'Links'], ['dateRange', 'Rentang tgl']].map(([k, lbl]) => (
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
      </div>

      {sugOpen && <div className="fixed inset-0 z-40" onClick={() => setSugOpen(false)} />}

      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 px-3 py-2 dark:border-gray-800">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Variabel →</span>
          {chips.map((chip) => {
            const enabled = isChipEnabled(chip)
            return (
              <div
                key={chip.id}
                draggable={enabled}
                onDragStart={(e) => handleChipDragStart(e, chip)}
                onClick={() => enabled && insertAtCursor(chip.var)}
                title={enabled ? 'Klik atau drag ke editor' : 'Aktifkan konfigurasi terkait dulu'}
                className={`inline-flex shrink-0 cursor-grab items-center gap-1 rounded-md border px-2 py-1 text-xs transition-opacity select-none ${CAT_CLASS[chip.cat]} ${enabled ? 'opacity-100 hover:brightness-95' : 'cursor-not-allowed opacity-30'}`}
              >
                {chip.label}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-3 py-2">
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
              <option value="simple">Gaya simple</option>
              <option value="summary_first">Summary dulu, baru detail</option>
            </select>
          )}

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <ToggleItem label="Acak urutan link" active={cfg.shuffle} onToggle={() => togCfg('shuffle')} />

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <ToggleItem label="Prioritas link" active={cfg.sortByPriority} onToggle={() => togCfg('sortByPriority')} />
        </div>
      </div>

      {validationError && (
        <div className="shrink-0 border-b border-error-200 bg-error-50 px-4 py-2 text-sm whitespace-pre-line text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
          ⚠ {validationError}
        </div>
      )}

      {/* ── Editor | Preview ── */}
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
            TEMPLATE — drag variabel dari toolbar, atau klik/ketik langsung
          </div>
          <textarea
            ref={taRef}
            name="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            onDragOver={handleTaDragOver}
            onDragLeave={handleTaDragLeave}
            onDrop={handleTaDrop}
            placeholder="Mulai ketik atau drag variabel dari toolbar di atas..."
            className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-white p-4 font-mono text-xs leading-relaxed text-gray-900 outline-none placeholder-gray-300 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-700"
          />
        </div>

        <div className="flex min-h-0 flex-col bg-gray-50 dark:bg-gray-900">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">HASIL LAPORAN</span>
            <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs text-success-700 dark:bg-success-500/15 dark:text-success-400">● Live</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!template.trim() ? (
              <p className="mt-12 text-center text-xs text-gray-300 dark:text-gray-600">
                Mulai ketik atau drag variabel untuk melihat preview...
              </p>
            ) : previewError ? (
              <p className="text-xs text-error-600 dark:text-error-400">Template error: {previewError}</p>
            ) : (
              <pre className="wrap-break-word font-sans text-xs whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">{preview}</pre>
            )}
          </div>
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600">
            Data dummy · preview berubah otomatis
          </div>
        </div>
      </div>

      <input type="hidden" name="config" value={JSON.stringify(configPayload)} />
    </form>
  )
}

function ToggleItem({ label, active, onToggle }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-4 w-7 rounded-full border-none transition-colors ${active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${active ? 'left-3.5' : 'left-0.5'}`} />
      </button>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </label>
  )
}