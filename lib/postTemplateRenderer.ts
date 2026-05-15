// Pure post-template renderer.
// Replaces hardcoded generateTH/EN in app/admin/facebook-post/page.tsx.
// Pure (no I/O), unit-testable. Mirrors legacy output byte-for-byte when
// the seeded "Modern (default)" template is rendered against the same
// property + extras inputs.

import type { Property, PostTemplate, PostTemplateSection, PostSectionKey, StyleParams } from '@/types'

export const SEP = '─────────────────────'

// ─── Property type / furnishing maps (moved from page.tsx) ─────────────────

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

// ─── PostExtras shape (form state from composer) ───────────────────────────

export interface PriceTier {
  label: string
  labelEN: string
  price: string
}

export interface PostExtras {
  taglineTH: string
  taglineEN: string
  furnished: 'fully' | 'semi' | 'unfurnished'
  nearbyMain: string
  priceTiers: PriceTier[]
  deposit: string
  facilityLines: string
  nearbyLines: string
}

export interface RenderTranslations {
  facilitiesEN?: string[]
  nearbyEN?: string[]
}

// ─── Hashtag builders ───────────────────────────────────────────────────────

export function buildHashtagsTH(p: Property): string {
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

export function buildHashtagsEN(p: Property): string {
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

// ─── Default labels (fallback when section.label_xx is empty) ──────────────

const DEFAULT_LABELS_TH: Partial<Record<PostSectionKey, string>> = {
  facilities: '🏊 Facilities ครบครัน',
  nearby: '📍 สถานที่ใกล้เคียง',
}
const DEFAULT_LABELS_EN: Partial<Record<PostSectionKey, string>> = {
  facilities: '🏊 World-Class Facilities',
  nearby: '📍 Nearby Locations',
}

// ─── Section render context ─────────────────────────────────────────────────

interface RenderCtx {
  property: Property
  extras: PostExtras
  style: StyleParams
  lang: 'th' | 'en'
  section: PostTemplateSection
  translated?: RenderTranslations
}

type SectionRenderer = (ctx: RenderCtx) => string | null

// Each renderer returns the section's full block INCLUDING its trailing SEP
// where the legacy code had one. Returning null = skip section.

const RENDER_HEADER: SectionRenderer = ({ property: p, lang }) => {
  const lines: string[] = []
  if (lang === 'th') {
    lines.push('🔑 The Cozy Keys (English versionis Below)')
    lines.push(`✨ ให้เช่า | ${p.title}`)
  } else {
    lines.push('🔑 The Cozy Keys')
    lines.push(`✨ For Rent | ${p.title_en || p.title}`)
  }
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_DESCRIPTION: SectionRenderer = ({ extras, lang }) => {
  const tagline = lang === 'th' ? extras.taglineTH.trim() : extras.taglineEN.trim()
  if (!tagline) return null
  return tagline
}

const RENDER_DETAILS: SectionRenderer = ({ property: p, extras, lang }) => {
  const typeEmoji = TYPE_EMOJI[p.property_type] || '🏠'
  const lines: string[] = []
  if (lang === 'th') {
    const typeTH = TYPE_LABEL_TH[p.property_type] || p.property_type
    const furnishedTH = FURNISHED_TH[extras.furnished]
    const nearbyPart = extras.nearbyMain.trim() ? ` ใกล้ ${extras.nearbyMain.trim()}` : ''
    const floorTH = p.floor ? ` | ชั้น ${p.floor}` : ''
    lines.push(`${typeEmoji} ${typeTH} · ${p.area_sqm} ตร.ม. | ${p.bedrooms} นอน | ${p.bathrooms} น้ำ${floorTH} | ${furnishedTH}`)
    lines.push(`📍 ${p.district} ${p.province}${nearbyPart}`)
  } else {
    const typeEN = TYPE_LABEL_EN[p.property_type] || p.property_type
    const furnishedEN = FURNISHED_EN[extras.furnished]
    const nearbyPart = extras.nearbyMain.trim() ? ` · Near ${extras.nearbyMain.trim()}` : ''
    const floorEN = p.floor ? ` | Floor ${p.floor}` : ''
    lines.push(`${typeEmoji} ${typeEN} · ${p.area_sqm} sqm. | ${p.bedrooms} Bed | ${p.bathrooms} Bath${floorEN} | ${furnishedEN}`)
    lines.push(`📍 ${p.district}, ${p.province}${nearbyPart}`)
  }
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_FACILITIES: SectionRenderer = ({ extras, lang, section, translated, style }) => {
  const list = lang === 'en'
    ? (translated?.facilitiesEN ?? extras.facilityLines.trim().split('\n').filter(Boolean))
    : extras.facilityLines.trim().split('\n').filter(Boolean)
  if (list.length === 0) return null
  const cap = section.options?.max_items ?? (style.length === 'short' ? 4 : list.length)
  const items = list.slice(0, cap)
  const label = (lang === 'th' ? section.label_th : section.label_en)
    || (lang === 'th' ? DEFAULT_LABELS_TH.facilities! : DEFAULT_LABELS_EN.facilities!)
  const lines: string[] = [label]
  items.forEach(f => lines.push(`› ${f}`))
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_NEARBY: SectionRenderer = ({ extras, lang, section, translated, style }) => {
  const list = lang === 'en'
    ? (translated?.nearbyEN ?? extras.nearbyLines.trim().split('\n').filter(Boolean))
    : extras.nearbyLines.trim().split('\n').filter(Boolean)
  if (list.length === 0) return null
  const cap = section.options?.max_items ?? (style.length === 'short' ? 4 : list.length)
  const items = list.slice(0, cap)
  const label = (lang === 'th' ? section.label_th : section.label_en)
    || (lang === 'th' ? DEFAULT_LABELS_TH.nearby! : DEFAULT_LABELS_EN.nearby!)
  const lines: string[] = [label]
  items.forEach(n => lines.push(`› ${n}`))
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_PRICE: SectionRenderer = ({ property: p, extras, lang }) => {
  const lines: string[] = []
  const p1 = p.price_monthly.toLocaleString()
  if (lang === 'th') {
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
  } else {
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
  }
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_CTA: SectionRenderer = ({ style }) => {
  const lines: string[] = []
  const wantPhone = style.ctaTarget === 'phone' || style.ctaTarget === 'both'
  const wantLine = style.ctaTarget === 'line' || style.ctaTarget === 'both'
  if (wantPhone) {
    lines.push('☎️ 087 670 6436 (K.Nut)')
    lines.push('☎️ 098 091 5461 (K.Dear)')
  }
  if (wantLine) {
    lines.push('💬 LINE: @thecozykeys')
  }
  lines.push(SEP)
  return lines.join('\n')
}

const RENDER_HASHTAGS: SectionRenderer = ({ property: p, lang, style }) => {
  const tags = (lang === 'th' ? buildHashtagsTH(p) : buildHashtagsEN(p)).split(' ')
  const cap = Math.max(1, style.hashtagCount ?? tags.length)
  const sliced = tags.slice(0, cap)
  if (style.audience === 'expat' && lang === 'en' && !sliced.some(t => t === '#ExpatThailand')) {
    sliced.push('#ExpatThailand')
  }
  return sliced.join(' ')
}

const RENDER_DIVIDER: SectionRenderer = ({ section, lang }) => {
  const label = lang === 'th' ? section.label_th : section.label_en
  return label || SEP
}

const RENDER_CUSTOM_TEXT: SectionRenderer = ({ section, lang }) => {
  const text = lang === 'th' ? section.options?.text_th : section.options?.text_en
  if (!text || !text.trim()) return null
  return text
}

const SECTION_RENDERERS: Record<PostSectionKey, SectionRenderer> = {
  header: RENDER_HEADER,
  description: RENDER_DESCRIPTION,
  details: RENDER_DETAILS,
  facilities: RENDER_FACILITIES,
  nearby: RENDER_NEARBY,
  price: RENDER_PRICE,
  cta: RENDER_CTA,
  hashtags: RENDER_HASHTAGS,
  divider: RENDER_DIVIDER,
  custom_text: RENDER_CUSTOM_TEXT,
}

// ─── Style modulation: emoji strip ──────────────────────────────────────────

// Built via constructor so TS (target=es5) doesn't reject the `u` flag in a literal.
const EMOJI_RE = new RegExp('[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F2FF}☺-❤☀-⛿☎️✨✅✓🔑]', 'gu')

function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim()
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const DEFAULT_STYLE: StyleParams = {
  tone: 'warm',
  length: 'medium',
  emojiDensity: 2,
  hashtagCount: 99,
  audience: 'general',
  ctaTarget: 'both',
}

export function renderTemplate(
  template: PostTemplate,
  property: Property,
  extras: PostExtras,
  style: StyleParams = DEFAULT_STYLE,
  lang: 'th' | 'en' = 'th',
  translated?: RenderTranslations,
): string {
  const blocks: string[] = []
  for (const section of template.sections) {
    if (!section.enabled) continue
    const renderer = SECTION_RENDERERS[section.key]
    if (!renderer) continue
    const out = renderer({ property, extras, style, lang, section, translated })
    if (out === null || out === '') continue
    blocks.push(style.emojiDensity === 0 ? stripEmoji(out) : out)
  }
  return blocks.join('\n')
}

export function renderBothLangs(
  template: PostTemplate,
  property: Property,
  extras: PostExtras,
  style: StyleParams = DEFAULT_STYLE,
  translated?: RenderTranslations,
): { th: string; en: string } {
  return {
    th: renderTemplate(template, property, extras, style, 'th', translated),
    en: renderTemplate(template, property, extras, style, 'en', translated),
  }
}
