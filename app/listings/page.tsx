'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PropertyCard from '@/components/ui/PropertyCard'
import { getProperties } from '@/lib/supabase'
import type { Property, FilterState } from '@/types'

const DISTRICTS = ['ทั้งหมด', 'ศรีราชา', 'แหลมฉบัง', 'บ้านบึง']
const TYPES = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'condo', label: 'คอนโด' },
  { value: 'house', label: 'บ้านเดี่ยว' },
  { value: 'townhome', label: 'ทาวน์โฮม' },
]
const BEDROOMS = [
  { value: '', label: 'ทุกขนาด' },
  { value: '1', label: '1 ห้องนอน' },
  { value: '2', label: '2 ห้องนอน' },
  { value: '3', label: '3+ ห้องนอน' },
]
const PRICES = [
  { value: '', label: 'ทุกราคา' },
  { value: '0-10000', label: 'ไม่เกิน ฿10,000' },
  { value: '10000-20000', label: '฿10,000 – ฿20,000' },
  { value: '20000-999999', label: '฿20,000 ขึ้นไป' },
]

export default function ListingsPage() {
  const searchParams = useSearchParams()
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    district: searchParams.get('district') || '',
    property_type: searchParams.get('type') || '',
    min_price: 0,
    max_price: 999999,
    bedrooms: '',
  })
  const [priceRange, setPriceRange] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProperties().then(data => { setAllProperties(data); setLoading(false) })
  }, [])

  // Apply filters
  useEffect(() => {
    let result = [...allProperties]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    }
    if (filters.district) result = result.filter(p => p.district === filters.district)
    if (filters.property_type) result = result.filter(p => p.property_type === filters.property_type)
    if (filters.min_price > 0) result = result.filter(p => p.price_monthly >= filters.min_price)
    if (filters.max_price < 999999) result = result.filter(p => p.price_monthly <= filters.max_price)
    if (filters.bedrooms) result = result.filter(p => {
      if (filters.bedrooms === '3') return p.bedrooms >= 3
      return p.bedrooms === parseInt(filters.bedrooms)
    })

    setProperties(result)
  }, [filters, search, allProperties])

  const handlePrice = (val: string) => {
    setPriceRange(val)
    if (!val) { setFilters(f => ({ ...f, min_price: 0, max_price: 999999 })); return }
    const [min, max] = val.split('-').map(Number)
    setFilters(f => ({ ...f, min_price: min, max_price: max }))
  }

  const clearFilters = () => {
    setFilters({ district: '', property_type: '', min_price: 0, max_price: 999999, bedrooms: '' })
    setPriceRange('')
    setSearch('')
  }

  const hasFilters = !!(filters.district || filters.property_type || priceRange || filters.bedrooms || search)

  return (
    <>
      <Navbar />
      <div className="pt-16">
        {/* Header */}
        <div className="px-6 lg:px-16 py-16" style={{ background: 'var(--cream-dark)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--terracotta)' }}>
              ทรัพย์ทั้งหมด
            </div>
            <h1 className="font-serif mb-2" style={{ fontSize: 'clamp(28px,4vw,48px)', color: 'var(--brown)' }}>
              ค้นหาทรัพย์ที่<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>ใช่</em>
            </h1>
            <p className="font-light" style={{ color: 'var(--text-light)' }}>
              {properties.length} ทรัพย์ที่พบ
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-10">
          {/* Search + filter bar */}
          <div className="flex gap-3 mb-8 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงการ หรือทำเล..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none border transition-all"
                style={{
                  background: 'white',
                  borderColor: 'rgba(196,98,45,0.15)',
                  color: 'var(--text-dark)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--terracotta)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(196,98,45,0.15)')}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: showFilters ? 'var(--terracotta)' : 'white',
                borderColor: showFilters ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                color: showFilters ? 'white' : 'var(--brown)',
              }}
            >
              <SlidersHorizontal size={15} /> ตัวกรอง
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}
              >
                <X size={14} /> ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div
              className="rounded-2xl p-6 mb-8 border grid grid-cols-2 md:grid-cols-4 gap-4"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}
            >
              {/* District */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-light)' }}>
                  ทำเล
                </label>
                <select
                  value={filters.district}
                  onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                >
                  {DISTRICTS.map(d => (
                    <option key={d} value={d === 'ทั้งหมด' ? '' : d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-light)' }}>
                  ประเภท
                </label>
                <select
                  value={filters.property_type}
                  onChange={e => setFilters(f => ({ ...f, property_type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                >
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-light)' }}>
                  ราคา
                </label>
                <select
                  value={priceRange}
                  onChange={e => handlePrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                >
                  {PRICES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-light)' }}>
                  ห้องนอน
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={e => setFilters(f => ({ ...f, bedrooms: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                >
                  {BEDROOMS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* District pills */}
          <div className="flex gap-2 flex-wrap mb-8">
            {DISTRICTS.map(d => {
              const val = d === 'ทั้งหมด' ? '' : d
              const active = filters.district === val
              return (
                <button
                  key={d}
                  onClick={() => setFilters(f => ({ ...f, district: val }))}
                  className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                  style={{
                    background: active ? 'var(--terracotta)' : 'white',
                    borderColor: active ? 'var(--terracotta)' : 'rgba(196,98,45,0.2)',
                    color: active ? 'white' : 'var(--text-mid)',
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                  <div className="skeleton h-52 w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="flex gap-3 pt-1">
                      <div className="skeleton h-3 w-16" />
                      <div className="skeleton h-3 w-16" />
                      <div className="skeleton h-3 w-16" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="skeleton h-5 w-24" />
                      <div className="skeleton h-8 w-20 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4 opacity-30">🏠</div>
              <div className="font-serif text-xl mb-2" style={{ color: 'var(--brown)' }}>ไม่พบทรัพย์</div>
              <div className="text-sm font-light mb-6" style={{ color: 'var(--text-light)' }}>
                ลองเปลี่ยนเงื่อนไขการค้นหา หรือติดต่อเราโดยตรง
              </div>
              <button
                onClick={clearFilters}
                className="px-6 py-3 rounded-full text-sm font-medium text-white"
                style={{ background: 'var(--terracotta)' }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {properties.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
