"use client"

import { useState } from 'react'
import { CloseIcon } from '@/icons'

export default function DomainTagInput({ name = 'domain', defaultValue = [] }) {
  const [domains, setDomains] = useState(defaultValue)
  const [input, setInput] = useState('')

  const addDomain = () => {
    const value = input.trim().toLowerCase()
    if (!value || domains.includes(value)) {
      setInput('')
      return
    }
    setDomains([...domains, value])
    setInput('')
  }

  const removeDomain = (target) => {
    setDomains(domains.filter((d) => d !== target))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addDomain()
    } else if (e.key === 'Backspace' && input === '' && domains.length > 0) {
      setDomains(domains.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-800">
        {domains.map((domain) => (
          <span
            key={domain}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {domain}
            <button type="button" onClick={() => removeDomain(domain)} className="text-gray-400 hover:text-error-500">
              <CloseIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDomain}
          placeholder={domains.length === 0 ? 'Ketik domain lalu Enter...' : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white"
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-400 text-left ">Tekan Enter buat nambahin, klik × buat hapus</p>

      {/* Ini yang beneran dikirim ke Server Action — array di-encode jadi string JSON */}
      <input type="hidden" name={name} value={JSON.stringify(domains)} />
    </div>
  )
}