'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Copy, Check, RefreshCw, Sparkles, Share2 } from 'lucide-react'
import { getProperties } from '@/lib/supabase'
import { fetchPropertyInfo } from './actions'
import type { Property } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

// ─── Constants ───────────────────────────────────────────────────────────────

const SEP = '─────────────────────'

const TYPE_LABEL_TH: Record<string, string> = {
  condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม',
}
const TYPE_LABEL_EN: Record<string, string> = {
  condo: 'Condo', house: 'House', townhome: 'Townhome',
}
const TYPE_EMOJI: Record<string, string> = {
  condo: '🏢', house: '🏠', townhome: '🏘️',
}

const FURNISHED_TH: Record<string, string> = {
  fully: 'Fully Furnished',
  semi: 'Semi-Furnished',
  unfurnished: 'ไม่มีเฟอร์นิเจอร์',
}
const FURNISHED_EN: Record<string, string> = {
  fully: 'Fully Furnished',
  semi: 'Semi-Furnished',
  unfurnished: 'Unfurnished',
}

const STATUS_STYLE = {
  available: { label: 'ว่าง', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  reserved:  { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  rented:    { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
}

// ─── Post generator ───────────────────────────────────────────────────────────

interface PostExtras {
  taglineTH: string
  taglineEN: string
  furnished: 'fully' | 'semi' | 'unfurnished'
  nearbyMain: string
  price6: string
  price12: string
  facilityLines: string
  nearbyLines: string
}

function buildHashtagsTH(p: Property) {
  const type = TYPE_LABEL_EN[p.property_type] || ''
  const district = p.district.replace(/\s/g, '')
  return [
    `#ให้เช่า${type}`,
    `#${district}`,
    `#${TYPE_LABEL_TH[p.property_type]}`,
    '#ชลบุรี',
    '#TheCozyKeys',
    '#CondoForRent',
    '#ศรีราชา',
    '#แหลมฉบัง',
    '#EasternSeaboard',
  ].join(' ')
}

function buildHashtagsEN(p: Property) {
  const type = TYPE_LABEL_EN[p.property_type] || ''
  const district = p.district.replace(/\s/g, '')
  return [
    `#${type}ForRent`,
    `#${district}`,
    `#${type}`,
    '#Chonburi',
    '#TheCozyKeys',
    '#Sriracha',
    '#LaemChabang',
    '#EasternSeaboard',
    '#ExpatThailand',
    '#WorkFromAnywhere',
  ].join(' ')
}

function generateTH(p: Property, extras: PostExtras): string {
  const lines: string[] = []
  const typeTH = TYPE_LABEL_TH[p.property_type] || p.property_type
  const typeEmoji = TYPE_EMOJI[p.property_type] || '🏠'

  lines.push('🔑 The Cozy Keys')
  lines.push(`✨ ให้เช่า | ${p.title}`)
  lines.push(SEP)

  if (extras.taglineTH.trim()) lines.push(extras.taglineTH.trim())

  const furnishedTH = FURNISHED_TH[extras.furnished]
  const nearbyPart = extras.nearbyMain.trim() ? ` ใกล้ ${extras.nearbyMain.trim()}` : ''
  lines.push(`${typeEmoji} ${typeTH} · ${p.area_sqm} ตร.ม. | ${p.bedrooms} นอน | ${p.bathrooms} น้ำ | ${furnishedTH}`)
  lines.push(`📍 ${p.district} ${p.province}${nearbyPart}`)
  lines.push(SEP)

  const facilities = extras.facilityLines.trim().split('\n').filter(Boolean)
  if (facilities.length > 0) {
    lines.push('🏊 Facilities ครบครัน')
    facilities.forEach(f => lines.push(`› ${f}`))
    lines.push(SEP)
  }

  const nearby = extras.nearbyLines.trim().split('\n').filter(Boolean)
  if (nearby.length > 0) {
    lines.push('📍 สถานที่ใกล้เคียง')
    nearby.forEach(n => lines.push(`› ${n}`))
    lines.push(SEP)
  }

  // Pricing
  const p1 = p.price_monthly.toLocaleString()
  const has6 = extras.price6.trim()
  const has12 = extras.price12.trim()
  if (has6 || has12) {
    lines.push('💰 ราคาพิเศษตามระยะสัญญา')
    lines.push(`📋 1 เดือน — ${p1} บาท`)
    if (has6) lines.push(`📋 6 เดือน — ${Number(has6).toLocaleString()} บาท/เดือน`)
    if (has12) lines.push(`📋 1 ปี — ${Number(has12).toLocaleString()} บาท/เดือน`)
    lines.push('ประกัน 2 เดือน')
  } else {
    lines.push(`💰 ราคาเช่า ${p1} บาท/เดือน`)
  }
  lines.push(SEP)

  lines.push('☎️ 087 670 6436 (K.Nut)')
  lines.push('☎️ 098 091 5461 (K.Dear)')
  lines.push('💬 LINE: @thecozykeys')
  lines.push(SEP)

  lines.push(buildHashtagsTH(p))

  return lines.join('\n')
}

function generateEN(p: Property, extras: PostExtras): string {
  const lines: string[] = []
  const typeEN = TYPE_LABEL_EN[p.property_type] || p.property_type
  const typeEmoji = TYPE_EMOJI[p.property_type] || '🏠'

  lines.push('🔑 The Cozy Keys')
  lines.push(`✨ For Rent | ${p.title_en || p.title}`)
  lines.push(SEP)

  if (extras.taglineEN.trim()) lines.push(extras.taglineEN.trim())

  const furnishedEN = FURNISHED_EN[extras.furnished]
  const nearbyPart = extras.nearbyMain.trim() ? ` · Near ${extras.nearbyMain.trim()}` : ''
  lines.push(`${typeEmoji} ${typeEN} · ${p.area_sqm} sqm. | ${p.bedrooms} Bed | ${p.bathrooms} Bath | ${furnishedEN}`)
  lines.push(`📍 ${p.district}, ${p.province}${nearbyPart}`)
  lines.push(SEP)

  const facilities = extras.facilityLines.trim().split('\n').filter(Boolean)
  if (facilities.length > 0) {
    lines.push('🏊 World-Class Facilities')
    facilities.forEach(f => lines.push(`› ${f}`))
    lines.push(SEP)
  }

  const nearby = extras.nearbyLines.trim().split('\n').filter(Boolean)
  if (nearby.length > 0) {
    lines.push('📍 Nearby Locations')
    nearby.forEach(n => lines.push(`› ${n}`))
    lines.push(SEP)
  }

  const p1 = p.price_monthly.toLocaleString()
  const has6 = extras.price6.trim()
  const has12 = extras.price12.trim()
  if (has6 || has12) {
    lines.push('💰 Flexible pricing by contract')
    lines.push(`📋 1 month — ${p1} THB`)
    if (has6) lines.push(`📋 6 months — ${Number(has6).toLocaleString()} THB/month`)
    if (has12) lines.push(`📋 1 year — ${Number(has12).toLocaleString()} THB/month`)
    lines.push('2-month security deposit required')
  } else {
    lines.push(`💰 Rental price ${p1} THB/month`)
  }
  lines.push(SEP)

  lines.push('☎️ 087 670 6436 (K.Nut)')
  lines.push('☎️ 098 091 5461 (K.Dear)')
  lines.push('💬 LINE: @thecozykeys')
  lines.push(SEP)

  lines.push(buildHashtagsEN(p))

  return lines.join('\n')
}

// ─── Component ────────────────────────────────────────────────────────────────

const BLANK_EXTRAS: PostExtras = {
  taglineTH: '',
  taglineEN: '',
  furnished: 'fully',
  nearbyMain: '',
  price6: '',
  price12: '',
  facilityLines: '',
  nearbyLines: '',
}

export default function FacebookPostPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Property | null>(null)
  const [extras, setExtras] = useState<PostExtras>(BLANK_EXTRAS)
  const [postTH, setPostTH] = useState('')
  const [postEN, setPostEN] = useState('')
  const [activeTab, setActiveTab] = useState<'th' | 'en'>('th')
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    getProperties().then(setProperties)
  }, [])

  const fetchGeminiInfo = async (property: Property) => {
    setAiLoading(true)
    setAiError('')
    try {
      const data = await fetchPropertyInfo(property.title, property.district, property.province)
      console.log(data);
      
      setExtras(prev => ({
        ...prev,
        facilityLines: data.facilities.join('\n'),
        nearbyLines: data.nearby.join('\n'),
      }))
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'ไม่สามารถดึงข้อมูลจาก Gemini ได้')
    } finally {
      setAiLoading(false)
    }
  }

  // Reset + fetch AI data when property changes
  useEffect(() => {
    if (!selected) return
    setExtras({ ...BLANK_EXTRAS })
    setPostTH('')
    setPostEN('')
    fetchGeminiInfo(selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const set = <K extends keyof PostExtras>(k: K, v: PostExtras[K]) =>
    setExtras(prev => ({ ...prev, [k]: v }))

  const handleGenerate = () => {
    if (!selected) return
    setPostTH(generateTH(selected, extras))
    setPostEN(generateEN(selected, extras))
  }

  const handleCopy = () => {
    const text = activeTab === 'th' ? postTH : postEN
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = search
    ? properties.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.district.includes(search)
      )
    : properties

  const activePost = activeTab === 'th' ? postTH : postEN

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>

      <AdminSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex overflow-hidden" style={{ maxHeight: '100vh' }}>

        {/* Left — property selector */}
        <div className="w-72 shrink-0 border-r flex flex-col"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold mb-3" style={{ color: 'var(--brown)' }}>
              เลือกทรัพย์
            </h2>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--cream)', border: '1px solid rgba(196,98,45,0.12)' }}>
              <Search size={13} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: 'var(--text-dark)' }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-light)' }}>
                ไม่พบทรัพย์
              </div>
            ) : (
              filtered.map(p => {
                const isSelected = selected?.id === p.id
                const statusS = STATUS_STYLE[p.status]
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className="w-full text-left px-3 py-3 rounded-xl mb-1 transition-all"
                    style={{
                      background: isSelected ? 'rgba(196,98,45,0.08)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(196,98,45,0.25)' : 'transparent'}`,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--cream)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div className="font-medium text-sm mb-1 leading-tight"
                      style={{ color: isSelected ? 'var(--terracotta)' : 'var(--brown)' }}>
                      {p.title}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                        {p.district} · ฿{p.price_monthly.toLocaleString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: statusS.bg, color: statusS.color }}>
                        {statusS.label}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right — form + output */}
        <div className="flex-1 overflow-y-auto p-8">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Share2 size={40} style={{ color: 'rgba(196,98,45,0.25)', marginBottom: 16 }} />
              <div className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--brown)' }}>
                เลือกทรัพย์เพื่อสร้างโพสต์
              </div>
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                เลือกทรัพย์จากรายการทางซ้ายเพื่อเริ่มสร้างโพสต์ Facebook
              </p>
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* Property summary */}
              <div className="rounded-2xl p-4 mb-6 flex items-center gap-4 border"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'var(--cream-dark)' }}>
                  {TYPE_EMOJI[selected.property_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold truncate" style={{ color: 'var(--brown)' }}>
                    {selected.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>
                    {selected.district}, {selected.province} · {selected.bedrooms} นอน · {selected.bathrooms} น้ำ · {selected.area_sqm} ตร.ม.
                  </div>
                </div>
                <div className="font-serif font-bold shrink-0" style={{ color: 'var(--terracotta)' }}>
                  ฿{selected.price_monthly.toLocaleString()}
                </div>
              </div>

              {/* ── Supplementary fields ── */}
              <div className="rounded-2xl border p-6 mb-6"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                <h3 className="font-serif font-semibold mb-5" style={{ color: 'var(--brown)' }}>
                  ข้อมูลเพิ่มเติม
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Tagline TH */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ไฮไลท์ (ภาษาไทย)
                    </label>
                    <input
                      type="text"
                      value={extras.taglineTH}
                      onChange={e => set('taglineTH', e.target.value)}
                      placeholder="เช่น วิวทะเลพาโนรามาชั้น 25 พร้อมระเบียงชมพระอาทิตย์ตก"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  {/* Tagline EN */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ไฮไลท์ (English)
                    </label>
                    <input
                      type="text"
                      value={extras.taglineEN}
                      onChange={e => set('taglineEN', e.target.value)}
                      placeholder="e.g. Panoramic sea view · Floor 25 · Sunset balcony"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  {/* Furnished + Nearby main */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      สภาพเฟอร์นิเจอร์
                    </label>
                    <select
                      value={extras.furnished}
                      onChange={e => set('furnished', e.target.value as PostExtras['furnished'])}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    >
                      <option value="fully">Fully Furnished</option>
                      <option value="semi">Semi-Furnished</option>
                      <option value="unfurnished">ไม่มีเฟอร์นิเจอร์</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ใกล้ (landmark หลัก)
                    </label>
                    <input
                      type="text"
                      value={extras.nearbyMain}
                      onChange={e => set('nearbyMain', e.target.value)}
                      placeholder="เช่น Central ศรีราชา"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  {/* Pricing tiers */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ราคา 6 เดือน/เดือน (ไม่บังคับ)
                    </label>
                    <input
                      type="number"
                      value={extras.price6}
                      onChange={e => set('price6', e.target.value)}
                      placeholder="เช่น 18000"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ราคา 1 ปี/เดือน (ไม่บังคับ)
                    </label>
                    <input
                      type="number"
                      value={extras.price12}
                      onChange={e => set('price12', e.target.value)}
                      placeholder="เช่น 15000"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>
                </div>

                {/* Facilities */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-mid)' }}>
                      Facilities (สระ / ฟิตเนส / ออนเซ็น ฯลฯ)
                      <span className="ml-1 font-normal" style={{ color: 'var(--text-light)' }}>(1 รายการต่อบรรทัด)</span>
                    </label>
                    {aiLoading && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--terracotta)' }}>
                        <Sparkles size={11} className="animate-pulse" /> AI กำลังค้นหา...
                      </span>
                    )}
                  </div>
                  <textarea
                    value={extras.facilityLines}
                    onChange={e => set('facilityLines', e.target.value)}
                    rows={4}
                    placeholder={aiLoading ? 'กำลังดึงข้อมูลจาก Gemini...' : 'สระว่ายน้ำ\nFitness\nCo-working Space'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-none font-mono"
                    style={{
                      background: 'var(--cream)',
                      borderColor: aiLoading ? 'rgba(196,98,45,0.35)' : 'rgba(196,98,45,0.15)',
                      color: 'var(--text-dark)',
                      opacity: aiLoading ? 0.6 : 1,
                    }}
                  />
                </div>

                {/* Nearby places */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-mid)' }}>
                      สถานที่ใกล้เคียง
                      <span className="ml-1 font-normal" style={{ color: 'var(--text-light)' }}>(1 รายการต่อบรรทัด)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => selected && fetchGeminiInfo(selected)}
                      disabled={aiLoading || !selected}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{
                        background: 'rgba(196,98,45,0.08)',
                        color: 'var(--terracotta)',
                        opacity: aiLoading ? 0.5 : 1,
                      }}
                    >
                      <Sparkles size={11} /> ดึงข้อมูล AI
                    </button>
                  </div>
                  {aiError && (
                    <div className="mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                      {aiError}
                    </div>
                  )}
                  <textarea
                    value={extras.nearbyLines}
                    onChange={e => set('nearbyLines', e.target.value)}
                    rows={5}
                    placeholder={aiLoading ? 'กำลังดึงข้อมูลจาก Gemini...' : 'สมิติเวช ศรีราชา — ~1.5 กม.\nCentral ศรีราชา — ~1.5 กม.\nPacific Park — ~2 กม.'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-none font-mono"
                    style={{
                      background: 'var(--cream)',
                      borderColor: aiLoading ? 'rgba(196,98,45,0.35)' : 'rgba(196,98,45,0.15)',
                      color: 'var(--text-dark)',
                      opacity: aiLoading ? 0.6 : 1,
                    }}
                  />
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium mb-6 transition-all"
                style={{ background: 'var(--terracotta)', color: 'white' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--terracotta-dark)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(196,98,45,0.35)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--terracotta)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <RefreshCw size={16} /> สร้างโพสต์
              </button>

              {/* Output */}
              {(postTH || postEN) && (
                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                  {/* Tabs */}
                  <div className="flex border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                    {(['th', 'en'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className="flex-1 py-3 text-sm font-medium transition-all"
                        style={{
                          color: activeTab === tab ? 'var(--terracotta)' : 'var(--text-mid)',
                          borderBottom: activeTab === tab ? '2px solid var(--terracotta)' : '2px solid transparent',
                          background: 'transparent',
                        }}
                      >
                        {tab === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
                      </button>
                    ))}
                  </div>

                  {/* Post textarea */}
                  <div className="p-4">
                    <textarea
                      value={activeTab === 'th' ? postTH : postEN}
                      onChange={e => activeTab === 'th' ? setPostTH(e.target.value) : setPostEN(e.target.value)}
                      className="w-full text-sm outline-none resize-none font-mono leading-relaxed"
                      style={{
                        color: 'var(--text-dark)',
                        background: 'transparent',
                        minHeight: 420,
                      }}
                    />
                  </div>

                  {/* Copy button */}
                  <div className="px-4 pb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!activePost}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: copied ? 'rgba(15,110,86,0.1)' : 'var(--cream-dark)',
                        color: copied ? '#0F6E56' : 'var(--brown)',
                      }}
                    >
                      {copied ? <><Check size={14} /> คัดลอกแล้ว!</> : <><Copy size={14} /> คัดลอก</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
