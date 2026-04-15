'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sub?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  searchPlaceholder?: string
}

export default function SearchableSelect({
  options, value, onChange,
  placeholder = '— เลือก —',
  emptyLabel = '— ไม่ระบุ —',
  searchPlaceholder = 'ค้นหา...',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sub && o.sub.toLowerCase().includes(search.toLowerCase()))
      )
    : options

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors text-left"
        style={{ background: 'white', borderColor: open ? 'var(--terracotta)' : 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }}
      >
        <span className={selected ? '' : 'opacity-50'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
              className="p-0.5 rounded hover:bg-gray-100 cursor-pointer"
              style={{ color: 'var(--text-light)' }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-light)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)' }}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
            <Search size={14} style={{ color: 'var(--text-light)' }} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--text-dark)' }}
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-auto">
            {/* Empty option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{ color: value === '' ? 'var(--terracotta)' : 'var(--text-light)' }}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 && (
              <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-light)' }}>
                ไม่พบผลลัพธ์
              </div>
            )}

            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                style={{ color: value === o.value ? 'var(--terracotta)' : 'var(--text-dark)', fontWeight: value === o.value ? 500 : 400 }}
              >
                {o.label}
                {o.sub && <span className="ml-1.5 text-xs" style={{ color: 'var(--text-light)' }}>({o.sub})</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
