"use client"

import { useState, useEffect, useMemo, useTransition } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SearchIcon } from '@/icons'
import LinkPrioritasFormModal from './LinkPrioritasFormModal'
import DeleteLinkPrioritasButton from './DeleteLinkPrioritasButton'
import { reorderPriorityLinksAction } from '@/app/(admin)/link-prioritas/actions'
import { useToast } from '@/context/ToastProvider'

const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

function GripIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <circle cx="5" cy="3" r="1.3" /><circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" /><circle cx="11" cy="13" r="1.3" />
    </svg>
  )
}

function RowCells({ link, index }) {
  return (
    <>
      <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{index + 1}</td>
      <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{link.keyword}</td>
      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{link.description || '-'}</td>
      <td className="px-5 py-3 text-sm">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
          link.isActive
            ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {link.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td className="px-5 py-3 text-right text-sm">
        <div className="flex items-center justify-end gap-3">
          <LinkPrioritasFormModal mode="edit" link={link} />
          <DeleteLinkPrioritasButton id={link.id} keyword={link.keyword} />
        </div>
      </td>
    </>
  )
}

// Row versi bisa di-drag — SELALU manggil useSortable, gak kondisional
function SortableLinkRow({ link, index, isEven }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`border-b border-gray-100 dark:border-gray-800 ${isEven ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}`}
    >
      <td className="w-10 px-3 py-3 text-center">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400">
          <GripIcon />
        </button>
      </td>
      <RowCells link={link} index={index} />
    </tr>
  )
}

// Row versi statis — dipakai pas lagi search/filter, gak ada drag sama sekali
function StaticLinkRow({ link, index, isEven }) {
  return (
    <tr className={`border-b border-gray-100 dark:border-gray-800 ${isEven ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
      <td className="w-10"></td>
      <RowCells link={link} index={index} />
    </tr>
  )
}

export default function LinkPrioritasList({ links }) {
  const [items, setItems] = useState(links)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [, startTransition] = useTransition()
  const { showToast } = useToast()

  useEffect(() => setItems(links), [links])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const isFiltering = search !== '' || status !== 'all'

  const filtered = useMemo(() => {
    return items.filter((l) => {
      const q = search.toLowerCase()
      const matchSearch = l.keyword.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q)
      const matchStatus = status === 'all' || (status === 'active' ? l.isActive : !l.isActive)
      return matchSearch && matchStatus
    })
  }, [items, search, status])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    startTransition(async () => {
      try {
        await reorderPriorityLinksAction(newItems.map((i) => i.id))
      } catch (error) {
        showToast('Gagal menyimpan urutan baru', 'error')
        setItems(links)
      }
    })
  }

  const tableHead = (
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-800">
        <th className="w-10"></th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Prioritas</th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Keyword</th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Deskripsi</th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
        <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
      </tr>
    </thead>
  )

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari keyword atau deskripsi..."
            className="w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  status === f.value
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <LinkPrioritasFormModal mode="create" />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length === items.length ? `${items.length} link` : `${filtered.length} dari ${items.length} link`}
        </span>
        {isFiltering && <span className="text-xs text-gray-400">Reset pencarian/filter buat geser urutan</span>}
      </div>

      <div className="overflow-x-auto">
        {isFiltering ? (
          <table className="w-full">
            {tableHead}
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada link yang sesuai dengan filter ini
                  </td>
                </tr>
              ) : (
                filtered.map((link, idx) => (
                  <StaticLinkRow key={link.id} link={link} index={items.findIndex((i) => i.id === link.id)} isEven={idx % 2 === 0} />
                ))
              )}
            </tbody>
          </table>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full">
                {tableHead}
                <tbody>
                  {items.map((link, idx) => (
                    <SortableLinkRow key={link.id} link={link} index={idx} isEven={idx % 2 === 0} />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}