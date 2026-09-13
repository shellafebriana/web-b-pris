"use client"

import { useState } from 'react'
import { CloseIcon } from '@/icons'

export default function TagInput({
  name,
  defaultValue = [],
  placeholder = 'Ketik lalu Enter...',
  hint = 'Tekan Enter untuk menambah, klik × untuk menghapus',
  lowercase = false,
}) {
  const [items, setItems] = useState(defaultValue)
  const [input, setInput] = useState('')

  const addItem = () => {
    const raw = input.trim()
    const value = lowercase ? raw.toLowerCase() : raw
    if (!value || items.includes(value)) {
      setInput('')
      return
    }
    setItems([...items, value])
    setInput('')
  }

  const removeItem = (target) => setItems(items.filter((i) => i !== target))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addItem()
    } else if (e.key === 'Backspace' && input === '' && items.length > 0) {
      setItems(items.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-800">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(item)}
              className="text-gray-400 hover:text-error-500"
            >
              <CloseIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addItem}
          placeholder={items.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white"
        />
      </div>
      <p className="mt-1.5 text-left text-xs text-gray-400">{hint}</p>

      {/* Array dikirim ke Server Action sebagai string JSON lewat input tersembunyi */}
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  )
}