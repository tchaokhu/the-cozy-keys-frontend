import { describe, it, expect } from 'vitest'
import { renderTemplate, SEP, DEFAULT_STYLE, type PostExtras } from './postTemplateRenderer'
import type { Property, PostTemplate } from '@/types'

// Seed "Modern (default)" definition — must mirror the seed in
// supabase/migrations/20260513_post_templates.sql.
const MODERN_TEMPLATE: PostTemplate = {
  id: 'fixture-modern',
  name: 'Modern (default)',
  is_default: true,
  sections: [
    { key: 'header',      enabled: true, label_th: '',                       label_en: '' },
    { key: 'description', enabled: true, label_th: '',                       label_en: '' },
    { key: 'details',     enabled: true, label_th: '',                       label_en: '' },
    { key: 'facilities',  enabled: true, label_th: '🏊 Facilities ครบครัน',   label_en: '🏊 World-Class Facilities' },
    { key: 'nearby',      enabled: true, label_th: '📍 สถานที่ใกล้เคียง',     label_en: '📍 Nearby Locations' },
    { key: 'price',       enabled: true, label_th: '',                       label_en: '' },
    { key: 'cta',         enabled: true, label_th: '',                       label_en: '' },
    { key: 'hashtags',    enabled: true, label_th: '',                       label_en: '' },
  ],
  created_at: '2026-05-13T00:00:00Z',
  updated_at: '2026-05-13T00:00:00Z',
}

const PROPERTY: Property = {
  id: 'p1',
  title: 'Stasia Sriracha 1BR ใกล้นิคม',
  title_en: 'Stasia Sriracha 1BR Near Industrial Estate',
  description: 'desc',
  price_monthly: 18000,
  property_type: 'condo',
  bedrooms: 1,
  bathrooms: 1,
  area_sqm: 32,
  floor: 8,
  building: 'Stasia',
  room_number: '0812',
  location: 'Sriracha',
  district: 'ศรีราชา',
  province: 'ชลบุรี',
  status: 'available',
  images: [],
  contact_line: '@thecozykeys',
  created_at: '2026-05-13T00:00:00Z',
  updated_at: '2026-05-13T00:00:00Z',
}

const EXTRAS_FULL: PostExtras = {
  taglineTH: 'ห้องสวย พร้อมเข้าอยู่ วิวสระว่ายน้ำ',
  taglineEN: 'Beautiful unit, move-in ready, pool view',
  furnished: 'fully',
  nearbyMain: 'Robinson Sriracha',
  priceTiers: [
    { label: '3 เดือน', labelEN: '3 months', price: '17500' },
    { label: '6 เดือน', labelEN: '6 months', price: '17000' },
  ],
  deposit: '2 เดือน',
  facilityLines: 'สระว่ายน้ำ\nฟิตเนส\nสวนพักผ่อน\nที่จอดรถ',
  nearbyLines: 'Robinson 1.2 km\nนิคมแหลมฉบัง 3 km\nMakro 2 km',
}

const EXTRAS_MIN: PostExtras = {
  taglineTH: '',
  taglineEN: '',
  furnished: 'fully',
  nearbyMain: '',
  priceTiers: [],
  deposit: '2 เดือน',
  facilityLines: '',
  nearbyLines: '',
}

// ─── Legacy generators (verbatim copies from app/admin/facebook-post/page.tsx
// at the time of refactor — used as parity oracle).

const TYPE_LABEL_TH: Record<string, string> = { condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม' }
const TYPE_LABEL_EN: Record<string, string> = { condo: 'Condo', house: 'House', townhome: 'Townhome' }
const TYPE_EMOJI: Record<string, string> = { condo: '🏢', house: '🏠', townhome: '🏘️' }
const FURNISHED_TH: Record<string, string> = { fully: 'Fully Furnished', semi: 'Semi-Furnished', unfurnished: 'ไม่มีเฟอร์นิเจอร์' }
const FURNISHED_EN: Record<string, string> = { fully: 'Fully Furnished', semi: 'Semi-Furnished', unfurnished: 'Unfurnished' }

function legacyHashtagsTH(p: Property) {
  const type = TYPE_LABEL_EN[p.property_type] || ''
  const district = p.district.replace(/\s/g, '')
  return [`#ให้เช่า${type}`, `#${district}`, `#${TYPE_LABEL_TH[p.property_type]}`, '#ชลบุรี', '#TheCozyKeys', '#CondoForRent', '#ศรีราชา', '#แหลมฉบัง', '#EasternSeaboard'].join(' ')
}

function legacyHashtagsEN(p: Property) {
  const type = TYPE_LABEL_EN[p.property_type] || ''
  const district = p.district.replace(/\s/g, '')
  return [`#${type}ForRent`, `#${district}`, `#${type}`, '#Chonburi', '#TheCozyKeys', '#Sriracha', '#LaemChabang', '#EasternSeaboard', '#ExpatThailand', '#WorkFromAnywhere'].join(' ')
}

function legacyGenerateTH(p: Property, extras: PostExtras): string {
  const lines: string[] = []
  const typeTH = TYPE_LABEL_TH[p.property_type] || p.property_type
  const typeEmoji = TYPE_EMOJI[p.property_type] || '🏠'
  lines.push('🔑 The Cozy Keys (English versionis Below)')
  lines.push(`✨ ให้เช่า | ${p.title}`)
  lines.push(SEP)
  if (extras.taglineTH.trim()) lines.push(extras.taglineTH.trim())
  const furnishedTH = FURNISHED_TH[extras.furnished]
  const nearbyPart = extras.nearbyMain.trim() ? ` ใกล้ ${extras.nearbyMain.trim()}` : ''
  const floorTH = p.floor ? ` | ชั้น ${p.floor}` : ''
  lines.push(`${typeEmoji} ${typeTH} · ${p.area_sqm} ตร.ม. | ${p.bedrooms} นอน | ${p.bathrooms} น้ำ${floorTH} | ${furnishedTH}`)
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
  const p1 = p.price_monthly.toLocaleString()
  const tiers = extras.priceTiers.filter(t => t.label.trim() && t.price.trim())
  if (tiers.length > 0) {
    lines.push('💰 ราคาพิเศษตามระยะสัญญา')
    lines.push(`📋 1 เดือน — ${p1} บาท`)
    tiers.forEach(t => lines.push(`📋 ${t.label} — ${Number(t.price).toLocaleString()} บาท/เดือน`))
    if (extras.deposit.trim()) lines.push(`ประกัน ${extras.deposit}`)
  } else {
    lines.push(`💰 ราคาเช่า ${p1} บาท/เดือน`)
    if (extras.deposit.trim()) lines.push(`ประกัน ${extras.deposit}`)
  }
  lines.push(SEP)
  lines.push('☎️ 087 670 6436 (K.Nut)')
  lines.push('☎️ 098 091 5461 (K.Dear)')
  lines.push('💬 LINE: @thecozykeys')
  lines.push(SEP)
  lines.push(legacyHashtagsTH(p))
  return lines.join('\n')
}

function legacyGenerateEN(p: Property, extras: PostExtras, translated?: { facilitiesEN: string[]; nearbyEN: string[] }): string {
  const lines: string[] = []
  const typeEN = TYPE_LABEL_EN[p.property_type] || p.property_type
  const typeEmoji = TYPE_EMOJI[p.property_type] || '🏠'
  lines.push('🔑 The Cozy Keys')
  lines.push(`✨ For Rent | ${p.title_en || p.title}`)
  lines.push(SEP)
  if (extras.taglineEN.trim()) lines.push(extras.taglineEN.trim())
  const furnishedEN = FURNISHED_EN[extras.furnished]
  const nearbyPart = extras.nearbyMain.trim() ? ` · Near ${extras.nearbyMain.trim()}` : ''
  const floorEN = p.floor ? ` | Floor ${p.floor}` : ''
  lines.push(`${typeEmoji} ${typeEN} · ${p.area_sqm} sqm. | ${p.bedrooms} Bed | ${p.bathrooms} Bath${floorEN} | ${furnishedEN}`)
  lines.push(`📍 ${p.district}, ${p.province}${nearbyPart}`)
  lines.push(SEP)
  const facilities = translated?.facilitiesEN ?? extras.facilityLines.trim().split('\n').filter(Boolean)
  if (facilities.length > 0) {
    lines.push('🏊 World-Class Facilities')
    facilities.forEach(f => lines.push(`› ${f}`))
    lines.push(SEP)
  }
  const nearby = translated?.nearbyEN ?? extras.nearbyLines.trim().split('\n').filter(Boolean)
  if (nearby.length > 0) {
    lines.push('📍 Nearby Locations')
    nearby.forEach(n => lines.push(`› ${n}`))
    lines.push(SEP)
  }
  const p1 = p.price_monthly.toLocaleString()
  const tiers = extras.priceTiers.filter(t => t.labelEN.trim() && t.price.trim())
  if (tiers.length > 0) {
    lines.push('💰 Flexible pricing by contract')
    lines.push(`📋 1 month — ${p1} THB`)
    tiers.forEach(t => lines.push(`📋 ${t.labelEN} — ${Number(t.price).toLocaleString()} THB/month`))
    if (extras.deposit.trim()) lines.push(`Deposit: ${extras.deposit}`)
  } else {
    lines.push(`💰 Rental price ${p1} THB/month`)
    if (extras.deposit.trim()) lines.push(`Deposit: ${extras.deposit}`)
  }
  lines.push(SEP)
  lines.push('☎️ 087 670 6436 (K.Nut)')
  lines.push('☎️ 098 091 5461 (K.Dear)')
  lines.push('💬 LINE: @thecozykeys')
  lines.push(SEP)
  lines.push(legacyHashtagsEN(p))
  return lines.join('\n')
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('renderTemplate parity with legacy generateTH/EN', () => {
  it('TH full extras matches legacy', () => {
    const got = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_FULL, DEFAULT_STYLE, 'th')
    const want = legacyGenerateTH(PROPERTY, EXTRAS_FULL)
    expect(got).toBe(want)
  })

  it('EN full extras matches legacy', () => {
    const got = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_FULL, DEFAULT_STYLE, 'en')
    const want = legacyGenerateEN(PROPERTY, EXTRAS_FULL)
    expect(got).toBe(want)
  })

  it('TH minimal (no tagline, no facilities, no nearby, no tiers) matches legacy', () => {
    const got = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_MIN, DEFAULT_STYLE, 'th')
    const want = legacyGenerateTH(PROPERTY, EXTRAS_MIN)
    expect(got).toBe(want)
  })

  it('EN minimal matches legacy', () => {
    const got = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_MIN, DEFAULT_STYLE, 'en')
    const want = legacyGenerateEN(PROPERTY, EXTRAS_MIN)
    expect(got).toBe(want)
  })

  it('EN with translated facilities/nearby matches legacy', () => {
    const translated = { facilitiesEN: ['Swimming Pool', 'Fitness', 'Garden', 'Parking'], nearbyEN: ['Robinson 1.2 km', 'Laem Chabang Industrial 3 km'] }
    const got = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_FULL, DEFAULT_STYLE, 'en', translated)
    const want = legacyGenerateEN(PROPERTY, EXTRAS_FULL, translated)
    expect(got).toBe(want)
  })
})

describe('style modulation', () => {
  it('hashtagCount caps tag count', () => {
    const out = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_MIN, { ...DEFAULT_STYLE, hashtagCount: 3 }, 'th')
    const lastLine = out.split('\n').pop()!
    expect(lastLine.split(' ').length).toBe(3)
  })

  it('ctaTarget=line only emits LINE row', () => {
    const out = renderTemplate(MODERN_TEMPLATE, PROPERTY, EXTRAS_MIN, { ...DEFAULT_STYLE, ctaTarget: 'line' }, 'th')
    expect(out).toContain('LINE: @thecozykeys')
    expect(out).not.toContain('K.Nut')
  })

  it('disabled section is skipped', () => {
    const tpl: PostTemplate = { ...MODERN_TEMPLATE, sections: MODERN_TEMPLATE.sections.map(s => s.key === 'hashtags' ? { ...s, enabled: false } : s) }
    const out = renderTemplate(tpl, PROPERTY, EXTRAS_MIN, DEFAULT_STYLE, 'th')
    expect(out).not.toMatch(/#TheCozyKeys/)
  })

  it('facilities options.max_items truncates list', () => {
    const tpl: PostTemplate = { ...MODERN_TEMPLATE, sections: MODERN_TEMPLATE.sections.map(s => s.key === 'facilities' ? { ...s, options: { ...(s.options || {}), max_items: 2 } } : s) }
    const out = renderTemplate(tpl, PROPERTY, EXTRAS_FULL, DEFAULT_STYLE, 'th')
    const bullets = out.split('\n').filter(l => l.startsWith('› '))
    // 2 from facilities + 3 from nearby = 5 (nearby not capped)
    expect(bullets.length).toBeGreaterThanOrEqual(5)
    // first 2 bullets are facilities
    expect(bullets.slice(0, 2)).toEqual(['› สระว่ายน้ำ', '› ฟิตเนส'])
  })
})
