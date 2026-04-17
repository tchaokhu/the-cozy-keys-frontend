'use client'
import { useState, useEffect } from 'react'
import { Search, Copy, Check, RefreshCw, Sparkles, Share2, X, Send, Clock, Loader2, ExternalLink, ImageIcon, MessageSquare, Home, Upload, FileText } from 'lucide-react'
import { getProperties, createScheduledPost, uploadPropertyImage } from '@/lib/supabase'
import { fetchPropertyInfo, checkFacebookConfig, publishToFacebook, translateFacilitiesAndNearby } from './actions'
import type { Property } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

// ─── Constants ───────────────────────────────────────────────────────────────

const SEP = '─────────────────────'

// ─── General Post Templates ──────────────────────────────────────────────────

interface PostTemplate {
  id: string
  label: string
  emoji: string
  contentTH: string
  contentEN: string
}

const GENERAL_TEMPLATES: PostTemplate[] = [
  {
    id: 'tip-checklist',
    label: 'เช็คลิสต์ก่อนเช่า',
    emoji: '📋',
    contentTH: `🔑 The Cozy Keys — Tips
${SEP}

📋 เช็คลิสต์ก่อนเช่าคอนโด ดูอะไรบ้าง?

✅ ตรวจสภาพห้อง — ผนัง พื้น เพดาน มีรอยร้าวหรือชำรุดไหม
✅ เช็คเฟอร์นิเจอร์ — ใช้งานได้จริงหรือเปล่า เปิดลิ้นชัก ลองนั่งโซฟา
✅ ทดสอบน้ำ-ไฟ — เปิดก๊อก กดชักโครก เปิดแอร์ ดูว่าทำงานปกติ
✅ ถ่ายรูปทุกจุด — ก่อนเข้าอยู่ถ่ายไว้เป็นหลักฐาน
✅ อ่านสัญญาให้ละเอียด — ค่ามัดจำ ค่าส่วนกลาง เงื่อนไขคืนเงิน
✅ สอบถามค่าใช้จ่ายเพิ่มเติม — ค่าน้ำ ค่าไฟ คิดยังไง

💬 มีข้อสงสัยเรื่องเช่าคอนโด ปรึกษาเราได้เลยค่ะ!

☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #เช่าคอนโด #TipsForRenters #ชลบุรี #ศรีราชา #แหลมฉบัง`,
    contentEN: `🔑 The Cozy Keys — Tips
${SEP}

📋 Condo Rental Checklist — What to Look For

✅ Inspect the room — Check walls, floors, ceiling for cracks or damage
✅ Test furniture — Open drawers, sit on the sofa, make sure everything works
✅ Check water & electricity — Turn on taps, flush toilets, test A/C
✅ Take photos — Document everything before moving in
✅ Read the contract carefully — Deposit, common fees, refund conditions
✅ Ask about extra costs — How are water & electricity charges calculated?

💬 Questions about renting? Feel free to reach out!

☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #CondoForRent #RentalTips #Chonburi #Sriracha #LaemChabang`,
  },
  {
    id: 'thank-you',
    label: 'ขอบคุณลูกค้า',
    emoji: '🙏',
    contentTH: `🔑 The Cozy Keys
${SEP}

🙏 ขอบคุณที่ไว้วางใจค่ะ!

ขอบคุณลูกค้าที่เลือกใช้บริการ The Cozy Keys
เราดีใจที่ได้เป็นส่วนหนึ่งในการหาบ้านที่ใช่ให้คุณ 🏠✨

ทุกความไว้วางใจคือกำลังใจให้เราพัฒนาบริการต่อไปค่ะ 💛

สนใจเช่าคอนโด/บ้าน ปรึกษาเราได้เลยนะคะ
☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #ขอบคุณ #ThankYou #ชลบุรี #ศรีราชา #แหลมฉบัง`,
    contentEN: `🔑 The Cozy Keys
${SEP}

🙏 Thank You for Trusting Us!

Thank you for choosing The Cozy Keys.
We're so happy to help you find the perfect home 🏠✨

Your trust means everything to us and inspires us to keep improving our service 💛

Looking for a condo or house to rent? Reach out anytime!
☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #ThankYou #CondoForRent #Chonburi #Sriracha #LaemChabang`,
  },
  {
    id: 'tip-foreigner',
    label: 'Tips สำหรับชาวต่างชาติ',
    emoji: '🌍',
    contentTH: `🔑 The Cozy Keys — Tips
${SEP}

🌍 Tips สำหรับชาวต่างชาติที่จะเช่าคอนโดในไทย

📄 เอกสารที่ต้องเตรียม
› พาสปอร์ต (สำเนา)
› Work Permit หรือ Visa
› สัญญาจ้างงาน (ถ้ามี)

💰 ค่าใช้จ่ายที่ควรรู้
› ค่ามัดจำ: ปกติ 2 เดือน
› ค่าเช่าล่วงหน้า: 1 เดือน
› ค่าน้ำ-ไฟ: จ่ายตามจริง

💡 สิ่งที่ควรรู้
› ค่าเช่าส่วนใหญ่ยังไม่รวมค่าน้ำ-ไฟ
› สัญญาขั้นต่ำมักเป็น 6 เดือน - 1 ปี
› สามารถต่อรองราคาได้ถ้าเช่าระยะยาว

💬 ปรึกษาเราได้เลย — เราพูดไทย & English!
☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #ExpatThailand #RentingInThailand #ชลบุรี #ศรีราชา #LaemChabang`,
    contentEN: `🔑 The Cozy Keys — Tips
${SEP}

🌍 Renting a Condo in Thailand? Here's What You Need to Know!

📄 Documents Required
› Passport (copy)
› Work Permit or Visa
› Employment contract (if available)

💰 Costs to Expect
› Security deposit: Usually 2 months
› Advance rent: 1 month
› Utilities: Paid separately based on usage

💡 Good to Know
› Rent usually doesn't include water & electricity
› Minimum lease is typically 6 months - 1 year
› Long-term contracts can get you better rates!

💬 Contact us — we speak Thai & English!
☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #ExpatThailand #RentingInThailand #Chonburi #Sriracha #LaemChabang`,
  },
  {
    id: 'tip-save-money',
    label: 'เทคนิคประหยัดค่าไฟ',
    emoji: '💡',
    contentTH: `🔑 The Cozy Keys — Tips
${SEP}

💡 เทคนิคประหยัดค่าไฟในคอนโด!

🌡️ แอร์
› ตั้งอุณหภูมิ 25-26°C ประหยัดไฟสุด
› เปิดพัดลมช่วยกระจายความเย็น
› ล้างแอร์ทุก 3-6 เดือน

🚿 น้ำร้อน
› อาบน้ำไม่เกิน 10 นาที
› ปิดเครื่องทำน้ำร้อนเมื่อไม่ใช้

💡 ไฟ & เครื่องใช้ไฟฟ้า
› ใช้หลอด LED ประหยัดไฟ 80%
› ถอดปลั๊กเครื่องใช้ไฟฟ้าที่ไม่ได้ใช้
› ใช้ตู้เย็นขนาดเหมาะสมกับห้อง

ทำตามนี้ ค่าไฟลดได้ 20-30% เลยค่ะ! 💰

☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #ประหยัดค่าไฟ #คอนโด #ชลบุรี #ศรีราชา #แหลมฉบัง`,
    contentEN: `🔑 The Cozy Keys — Tips
${SEP}

💡 Save on Your Electric Bill — Condo Edition!

🌡️ Air Conditioning
› Set temp to 25-26°C for best savings
› Use a fan to circulate cool air
› Clean A/C filters every 3-6 months

🚿 Hot Water
› Keep showers under 10 minutes
› Turn off water heater when not in use

💡 Lights & Appliances
› LED bulbs save 80% on lighting costs
› Unplug appliances when not in use
› Choose a fridge size that fits your needs

Follow these tips and save 20-30% on your bill! 💰

☎️ 087 670 6436 (K.Nut)
☎️ 098 091 5461 (K.Dear)
💬 LINE: @thecozykeys
${SEP}
#TheCozyKeys #SaveEnergy #CondoLiving #Chonburi #Sriracha #LaemChabang`,
  },
  {
    id: 'empty',
    label: 'เขียนเอง',
    emoji: '✏️',
    contentTH: '',
    contentEN: '',
  },
]

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

interface PriceTier {
  label: string
  labelEN: string
  price: string
}

interface PostExtras {
  taglineTH: string
  taglineEN: string
  furnished: 'fully' | 'semi' | 'unfurnished'
  nearbyMain: string
  priceTiers: PriceTier[]
  deposit: string
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

  // Pricing
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

  lines.push(buildHashtagsTH(p))

  return lines.join('\n')
}

function generateEN(p: Property, extras: PostExtras, translated?: { facilitiesEN: string[]; nearbyEN: string[] }): string {
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

  lines.push(buildHashtagsEN(p))

  return lines.join('\n')
}

// ─── Component ────────────────────────────────────────────────────────────────

const BLANK_EXTRAS: PostExtras = {
  taglineTH: '',
  taglineEN: '',
  furnished: 'fully',
  nearbyMain: '',
  priceTiers: [],
  deposit: '2 เดือน',
  facilityLines: '',
  nearbyLines: '',
}

export default function FacebookPostPage() {
  // Mode: property post vs general post
  const [postMode, setPostMode] = useState<'property' | 'general'>('property')

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Property | null>(null)
  const [extras, setExtras] = useState<PostExtras>(BLANK_EXTRAS)
  const [postTH, setPostTH] = useState('')
  const [postEN, setPostEN] = useState('')
  const [activeTab, setActiveTab] = useState<'th' | 'en'>('th')
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // General post states
  const [generalPostTH, setGeneralPostTH] = useState('')
  const [generalPostEN, setGeneralPostEN] = useState('')
  const [generalActiveTab, setGeneralActiveTab] = useState<'th' | 'en'>('th')
  const [generalCopied, setGeneralCopied] = useState(false)
  const [generalImages, setGeneralImages] = useState<string[]>([])
  const [generalUploading, setGeneralUploading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Facebook publish states
  const [fbConfigured, setFbConfigured] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [fbPublishing, setFbPublishing] = useState(false)
  const [fbResult, setFbResult] = useState<{ success: boolean; postId?: string; error?: string; scheduled?: boolean } | null>(null)
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  useEffect(() => {
    getProperties().then(data => { setProperties(data); setLoading(false) })
    checkFacebookConfig().then(r => setFbConfigured(r.configured))
  }, [])

  const fetchGeminiInfo = async (property: Property) => {
    setAiLoading(true)
    setAiError('')
    try {
      const data = await fetchPropertyInfo(property.title, property.district, property.province)
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

  // Reset + fill from building data when property changes
  useEffect(() => {
    if (!selected) return
    const bld = selected.buildingInfo
    setExtras({
      ...BLANK_EXTRAS,
      facilityLines: bld?.facilities?.join('\n') || '',
      nearbyLines: bld?.nearby?.join('\n') || '',
    })
    setPostTH('')
    setPostEN('')
    setSelectedImages(selected.images?.slice(0, 10) || [])
    setFbResult(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const set = <K extends keyof PostExtras>(k: K, v: PostExtras[K]) =>
    setExtras(prev => ({ ...prev, [k]: v }))

  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!selected) return
    setGenerating(true)
    setPostTH(generateTH(selected, extras))

    const facilityLines = extras.facilityLines.trim().split('\n').filter(Boolean)
    const nearbyLines = extras.nearbyLines.trim().split('\n').filter(Boolean)

    try {
      const translated = await translateFacilitiesAndNearby(facilityLines, nearbyLines)
      setPostEN(generateEN(selected, extras, translated))
    } catch {
      setPostEN(generateEN(selected, extras))
    } finally {
      setGenerating(false)
    }
  }

  // ─── General post handlers ──────────────────────────────────────────────
  const handleSelectTemplate = (tpl: PostTemplate) => {
    setSelectedTemplate(tpl.id)
    setGeneralPostTH(tpl.contentTH)
    setGeneralPostEN(tpl.contentEN)
    setFbResult(null)
  }

  const handleGeneralImageUpload = async (files: FileList) => {
    setGeneralUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 10 - generalImages.length)) {
        const url = await uploadPropertyImage(file)
        urls.push(url)
      }
      setGeneralImages(prev => [...prev, ...urls].slice(0, 10))
    } finally {
      setGeneralUploading(false)
    }
  }

  const handleGeneralCopy = () => {
    const text = generalActiveTab === 'th' ? generalPostTH : generalPostEN
    navigator.clipboard.writeText(text).then(() => {
      setGeneralCopied(true)
      setTimeout(() => setGeneralCopied(false), 2000)
    })
  }

  const handleCopy = () => {
    const text = activeTab === 'th' ? postTH : postEN
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Shared publish handler ────────────────────────────────────────────
  const handlePublishGeneral = async () => {
    if (!generalPostTH && !generalPostEN) return
    const scheduleInfo = publishMode === 'schedule' ? { date: scheduleDate, time: scheduleTime } : undefined
    if (scheduleInfo && (!scheduleInfo.date || !scheduleInfo.time)) {
      setFbResult({ success: false, error: 'กรุณาเลือกวันที่และเวลา' })
      return
    }
    const parts = [generalPostTH, generalPostEN].filter(Boolean)
    const text = parts.join(`\n\n${SEP}\n\n`)
    const action = publishMode === 'schedule'
      ? `ตั้งเวลาโพสต์ TH/EN พร้อม ${generalImages.length} รูป ไปยัง Facebook Page?`
      : `โพสต์ TH/EN พร้อม ${generalImages.length} รูป ไปยัง Facebook Page?`
    if (!window.confirm(action)) return

    setFbPublishing(true)
    setFbResult(null)
    try {
      const result = await publishToFacebook(text, generalImages, scheduleInfo)
      setFbResult({ success: true, postId: result.postId, scheduled: result.scheduled })
    } catch (e) {
      setFbResult({ success: false, error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' })
    } finally {
      setFbPublishing(false)
    }
  }

  const handlePublish = async () => {
    if (!postTH && !postEN) return
    const scheduleInfo = publishMode === 'schedule' ? { date: scheduleDate, time: scheduleTime } : undefined
    if (scheduleInfo && (!scheduleInfo.date || !scheduleInfo.time)) {
      setFbResult({ success: false, error: 'กรุณาเลือกวันที่และเวลา' })
      return
    }
    const parts = [postTH, postEN].filter(Boolean)
    const text = parts.join(`\n\n${SEP}\n\n`)
    const action = publishMode === 'schedule'
      ? `ตั้งเวลาโพสต์ TH/EN พร้อม ${selectedImages.length} รูป ไปยัง Facebook Page?`
      : `โพสต์ TH/EN พร้อม ${selectedImages.length} รูป ไปยัง Facebook Page?`
    if (!window.confirm(action)) return

    setFbPublishing(true)
    setFbResult(null)
    try {
      const result = await publishToFacebook(text, selectedImages, scheduleInfo)
      setFbResult({ success: true, postId: result.postId, scheduled: result.scheduled })

      // Save to scheduled_posts for calendar tracking
      if (selected) {
        try {
          await createScheduledPost({
            property_id: selected.id,
            post_content_th: postTH,
            post_content_en: postEN,
            scheduled_date: scheduleInfo?.date || new Date().toISOString().split('T')[0],
            scheduled_time: scheduleInfo?.time || new Date().toTimeString().slice(0, 5),
            images: selectedImages,
            status: result.scheduled ? 'scheduled' : 'published',
            fb_post_id: result.postId,
          })
        } catch (dbErr) {
          console.error('Failed to save to calendar:', dbErr)
        }
      }
    } catch (e) {
      setFbResult({ success: false, error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' })
    } finally {
      setFbPublishing(false)
    }
  }

  const toggleImage = (url: string) => {
    setSelectedImages(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : prev.length < 10 ? [...prev, url] : prev
    )
  }

  const filtered = search
    ? properties.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.district.includes(search)
      )
    : properties

  const activePost = activeTab === 'th' ? postTH : postEN

  const [showPicker, setShowPicker] = useState(false)

  const propertyListContent = (
    <>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>
            เลือกทรัพย์
          </h2>
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg"
            style={{ color: 'var(--text-mid)' }}
            onClick={() => setShowPicker(false)}
          >
            <X size={18} />
          </button>
        </div>
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
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-3 py-3 mb-1 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-28 rounded" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
          </div>
        )) : filtered.length === 0 ? (
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
                onClick={() => { setSelected(p); setShowPicker(false) }}
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
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>

      <AdminSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex overflow-hidden pt-16 md:pt-0" style={{ maxHeight: '100vh' }}>

        {/* Desktop — property selector panel (only in property mode) */}
        {postMode === 'property' && (
          <div className="hidden md:flex w-72 shrink-0 border-r flex-col"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            {propertyListContent}
          </div>
        )}

        {/* Mobile — property picker overlay */}
        {postMode === 'property' && showPicker && (
          <div className="md:hidden fixed inset-0 z-50" onClick={() => setShowPicker(false)}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
            <div
              className="absolute inset-x-3 top-16 bottom-4 rounded-2xl flex flex-col shadow-xl overflow-hidden"
              style={{ background: 'white', maxWidth: '95vw', margin: '0 auto' }}
              onClick={e => e.stopPropagation()}
            >
              {propertyListContent}
            </div>
          </div>
        )}

        {/* Right — form + output */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* ── Mode toggle ── */}
          <div className="flex gap-2 mb-6 max-w-2xl">
            {([
              { mode: 'property' as const, icon: Home, label: 'โพสต์ทรัพย์' },
              { mode: 'general' as const, icon: MessageSquare, label: 'โพสต์ทั่วไป' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button key={mode} type="button"
                onClick={() => { setPostMode(mode); setFbResult(null) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{
                  background: postMode === mode ? 'var(--terracotta)' : 'white',
                  borderColor: postMode === mode ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                  color: postMode === mode ? 'white' : 'var(--text-mid)',
                }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── GENERAL POST MODE ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {postMode === 'general' && (
            <div className="max-w-2xl">
              {/* Template selector */}
              <div className="rounded-2xl border p-6 mb-6"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                <h3 className="font-serif font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--brown)' }}>
                  <FileText size={16} style={{ color: 'var(--terracotta)' }} />
                  เลือก Template
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {GENERAL_TEMPLATES.map(tpl => (
                    <button key={tpl.id} type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all text-left"
                      style={{
                        background: selectedTemplate === tpl.id ? 'rgba(196,98,45,0.08)' : 'var(--cream)',
                        borderColor: selectedTemplate === tpl.id ? 'var(--terracotta)' : 'rgba(196,98,45,0.1)',
                        color: selectedTemplate === tpl.id ? 'var(--terracotta)' : 'var(--text-dark)',
                      }}>
                      <span className="text-lg">{tpl.emoji}</span>
                      <span className="font-medium">{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image upload */}
              <div className="rounded-2xl border p-6 mb-6"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-semibold flex items-center gap-2" style={{ color: 'var(--brown)' }}>
                    <ImageIcon size={16} style={{ color: 'var(--terracotta)' }} />
                    รูปภาพ (ไม่บังคับ)
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                    {generalImages.length}/10 รูป
                  </span>
                </div>

                {generalImages.length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-3">
                    {generalImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border"
                        style={{ borderColor: 'rgba(196,98,45,0.15)' }}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button type="button"
                          onClick={() => setGeneralImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}>
                          <X size={10} color="white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {generalImages.length < 10 && (
                  <label className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                    style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--terracotta)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(196,98,45,0.2)')}>
                    {generalUploading ? (
                      <><Loader2 size={16} className="animate-spin" /> กำลังอัพโหลด...</>
                    ) : (
                      <><Upload size={16} /> เพิ่มรูปภาพ</>
                    )}
                    <input type="file" accept="image/*" multiple className="hidden"
                      disabled={generalUploading}
                      onChange={e => e.target.files && handleGeneralImageUpload(e.target.files)} />
                  </label>
                )}
              </div>

              {/* Post editor */}
              {(generalPostTH || generalPostEN || selectedTemplate) && (
                <div className="rounded-2xl border overflow-hidden mb-6"
                  style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                  {/* Tabs */}
                  <div className="flex border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                    {(['th', 'en'] as const).map(tab => (
                      <button key={tab} type="button"
                        onClick={() => setGeneralActiveTab(tab)}
                        className="flex-1 py-3 text-sm font-medium transition-all"
                        style={{
                          color: generalActiveTab === tab ? 'var(--terracotta)' : 'var(--text-mid)',
                          borderBottom: generalActiveTab === tab ? '2px solid var(--terracotta)' : '2px solid transparent',
                          background: 'transparent',
                        }}>
                        {tab === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
                      </button>
                    ))}
                  </div>

                  {/* Editable textarea */}
                  <div className="p-4">
                    <textarea
                      value={generalActiveTab === 'th' ? generalPostTH : generalPostEN}
                      onChange={e => generalActiveTab === 'th' ? setGeneralPostTH(e.target.value) : setGeneralPostEN(e.target.value)}
                      placeholder="เขียนเนื้อหาโพสต์ที่นี่..."
                      className="w-full text-sm outline-none resize-none font-mono leading-relaxed"
                      style={{ color: 'var(--text-dark)', background: 'transparent', minHeight: 350 }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 pb-4 space-y-4">
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={handleGeneralCopy}
                        disabled={!(generalActiveTab === 'th' ? generalPostTH : generalPostEN)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: generalCopied ? 'rgba(15,110,86,0.1)' : 'var(--cream-dark)',
                          color: generalCopied ? '#0F6E56' : 'var(--brown)',
                        }}>
                        {generalCopied ? <><Check size={14} /> คัดลอกแล้ว!</> : <><Copy size={14} /> คัดลอก</>}
                      </button>
                    </div>

                    {/* Facebook publish section */}
                    {fbConfigured && (
                      <div className="border-t pt-4" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Share2 size={14} style={{ color: 'var(--terracotta)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--brown)' }}>โพสต์ไป Facebook Page</span>
                        </div>

                        <div className="flex gap-2 mb-3">
                          {(['now', 'schedule'] as const).map(mode => (
                            <button key={mode} type="button" onClick={() => setPublishMode(mode)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                              style={{
                                background: publishMode === mode ? 'var(--terracotta)' : 'white',
                                borderColor: publishMode === mode ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                                color: publishMode === mode ? 'white' : 'var(--text-mid)',
                              }}>
                              {mode === 'now' ? <><Send size={12} /> โพสต์เลย</> : <><Clock size={12} /> ตั้งเวลา</>}
                            </button>
                          ))}
                        </div>

                        {publishMode === 'schedule' && (
                          <div className="flex gap-2 mb-3">
                            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                              min={new Date().toISOString().split('T')[0]} />
                            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                              className="w-32 px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
                          </div>
                        )}

                        <button type="button" onClick={handlePublishGeneral}
                          disabled={fbPublishing || (!generalPostTH && !generalPostEN)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                          style={{ background: 'var(--terracotta)' }}>
                          {fbPublishing
                            ? <><Loader2 size={15} className="animate-spin" /> กำลังโพสต์...</>
                            : publishMode === 'now'
                              ? <><Send size={15} /> โพสต์ไป Facebook</>
                              : <><Clock size={15} /> ตั้งเวลาโพสต์</>
                          }
                        </button>

                        {fbResult && (
                          <div className="mt-3 px-4 py-3 rounded-xl text-sm border"
                            style={fbResult.success
                              ? { background: 'rgba(15,110,86,0.06)', borderColor: 'rgba(15,110,86,0.2)', color: '#0F6E56' }
                              : { background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }
                            }>
                            {fbResult.success ? (
                              <div>
                                {fbResult.scheduled
                                  ? <span>ตั้งเวลาโพสต์สำเร็จ! จะโพสต์วันที่ {scheduleDate} เวลา {scheduleTime}</span>
                                  : <span>โพสต์สำเร็จ!</span>
                                }
                                {fbResult.postId && (
                                  <a href={`https://facebook.com/${fbResult.postId}`} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 ml-2 underline">
                                    ดูโพสต์ <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span>{fbResult.error}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!fbConfigured && (
                      <div className="border-t pt-3 text-xs" style={{ borderColor: 'rgba(196,98,45,0.08)', color: 'var(--text-light)' }}>
                        ต้องการโพสต์ไป Facebook โดยตรง? เพิ่ม FACEBOOK_PAGE_ID และ FACEBOOK_PAGE_ACCESS_TOKEN ใน .env.local
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!generalPostTH && !generalPostEN && !selectedTemplate && (
                <div className="text-center py-16">
                  <MessageSquare size={40} style={{ color: 'rgba(196,98,45,0.25)', margin: '0 auto 16px' }} />
                  <div className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--brown)' }}>
                    สร้างโพสต์ทั่วไป
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                    เลือก template ด้านบน หรือกดเขียนเองเพื่อเริ่มต้น
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── PROPERTY POST MODE ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {postMode === 'property' && (
            <>
          {/* Mobile — select property button */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="md:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium mb-4 border"
            style={{
              background: 'white',
              borderColor: 'rgba(196,98,45,0.2)',
              color: 'var(--terracotta)',
            }}
          >
            <Search size={14} /> {selected ? 'เปลี่ยนทรัพย์' : 'เลือกทรัพย์'}
          </button>

          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Share2 size={40} style={{ color: 'rgba(196,98,45,0.25)', marginBottom: 16 }} />
              <div className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--brown)' }}>
                เลือกทรัพย์เพื่อสร้างโพสต์
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-light)' }}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                  {/* Deposit */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                      ค่าประกัน
                    </label>
                    <input
                      type="text"
                      value={extras.deposit}
                      onChange={e => set('deposit', e.target.value)}
                      placeholder="เช่น 2 เดือน"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
                      style={{
                        background: 'var(--cream)',
                        borderColor: 'rgba(196,98,45,0.15)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>
                </div>

                {/* Dynamic pricing tiers */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-mid)' }}>
                      ราคาตามระยะสัญญา (ไม่บังคับ)
                    </label>
                    <button
                      type="button"
                      onClick={() => setExtras(prev => ({
                        ...prev,
                        priceTiers: [...prev.priceTiers, { label: '', labelEN: '', price: '' }],
                      }))}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--terracotta)' }}
                    >
                      + เพิ่มช่วงราคา
                    </button>
                  </div>
                  {extras.priceTiers.length === 0 && (
                    <p className="text-xs py-2" style={{ color: 'var(--text-light)' }}>
                      ยังไม่มีราคาพิเศษ — โพสต์จะแสดงเฉพาะราคารายเดือน
                    </p>
                  )}
                  <div className="space-y-2">
                    {extras.priceTiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={e => {
                            const tiers = [...extras.priceTiers]
                            tiers[i] = { ...tiers[i], label: e.target.value }
                            setExtras(prev => ({ ...prev, priceTiers: tiers }))
                          }}
                          placeholder="TH เช่น 6 เดือน"
                          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                          style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                        />
                        <input
                          type="text"
                          value={tier.labelEN}
                          onChange={e => {
                            const tiers = [...extras.priceTiers]
                            tiers[i] = { ...tiers[i], labelEN: e.target.value }
                            setExtras(prev => ({ ...prev, priceTiers: tiers }))
                          }}
                          placeholder="EN e.g. 6 months"
                          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                          style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                        />
                        <input
                          type="number"
                          value={tier.price}
                          onChange={e => {
                            const tiers = [...extras.priceTiers]
                            tiers[i] = { ...tiers[i], price: e.target.value }
                            setExtras(prev => ({ ...prev, priceTiers: tiers }))
                          }}
                          placeholder="บาท/เดือน"
                          className="w-28 px-3 py-2 rounded-xl text-sm outline-none border"
                          style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setExtras(prev => ({
                            ...prev,
                            priceTiers: prev.priceTiers.filter((_, idx) => idx !== i),
                          }))}
                          className="p-1.5 rounded-lg hover:bg-red-50"
                          style={{ color: '#dc2626' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
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

              {/* Image selector */}
              {selected.images && selected.images.length > 0 && (
                <div className="rounded-2xl border p-6 mb-6"
                  style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif font-semibold flex items-center gap-2" style={{ color: 'var(--brown)' }}>
                      <ImageIcon size={16} style={{ color: 'var(--terracotta)' }} />
                      รูปภาพที่จะโพสต์
                    </h3>
                    <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                      {selectedImages.length}/{Math.min(selected.images.length, 10)} รูป
                    </span>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                    {selected.images.slice(0, 10).map((img, i) => {
                      const isOn = selectedImages.includes(img)
                      return (
                        <button key={i} type="button" onClick={() => toggleImage(img)}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 transition-all"
                          style={{
                            borderColor: isOn ? 'var(--terracotta)' : 'rgba(196,98,45,0.1)',
                            opacity: isOn ? 1 : 0.5,
                          }}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          {isOn && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: 'var(--terracotta)' }}>
                              <Check size={12} color="white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium mb-6 transition-all disabled:opacity-70"
                style={{ background: 'var(--terracotta)', color: 'white' }}
                onMouseEnter={e => {
                  if (!generating) e.currentTarget.style.background = 'var(--terracotta-dark)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(196,98,45,0.35)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--terracotta)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {generating
                  ? <><Loader2 size={16} className="animate-spin" /> กำลังสร้างโพสต์...</>
                  : <><RefreshCw size={16} /> สร้างโพสต์</>
                }
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

                  {/* Action buttons */}
                  <div className="px-4 pb-4 space-y-4">
                    <div className="flex gap-2 justify-end">
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

                    {/* Facebook publish section */}
                    {fbConfigured && (
                      <div className="border-t pt-4" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Share2 size={14} style={{ color: 'var(--terracotta)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--brown)' }}>โพสต์ไป Facebook Page</span>
                        </div>

                        {/* Mode toggle */}
                        <div className="flex gap-2 mb-3">
                          {(['now', 'schedule'] as const).map(mode => (
                            <button key={mode} type="button" onClick={() => setPublishMode(mode)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                              style={{
                                background: publishMode === mode ? 'var(--terracotta)' : 'white',
                                borderColor: publishMode === mode ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                                color: publishMode === mode ? 'white' : 'var(--text-mid)',
                              }}>
                              {mode === 'now' ? <><Send size={12} /> โพสต์เลย</> : <><Clock size={12} /> ตั้งเวลา</>}
                            </button>
                          ))}
                        </div>

                        {/* Schedule picker */}
                        {publishMode === 'schedule' && (
                          <div className="flex gap-2 mb-3">
                            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                              min={new Date().toISOString().split('T')[0]} />
                            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                              className="w-32 px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
                          </div>
                        )}

                        {/* Publish button */}
                        <button type="button" onClick={handlePublish} disabled={fbPublishing || (!postTH && !postEN)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                          style={{ background: 'var(--terracotta)' }}>
                          {fbPublishing
                            ? <><Loader2 size={15} className="animate-spin" /> กำลังโพสต์...</>
                            : publishMode === 'now'
                              ? <><Send size={15} /> โพสต์ไป Facebook</>
                              : <><Clock size={15} /> ตั้งเวลาโพสต์</>
                          }
                        </button>

                        {/* Result feedback */}
                        {fbResult && (
                          <div className="mt-3 px-4 py-3 rounded-xl text-sm border"
                            style={fbResult.success
                              ? { background: 'rgba(15,110,86,0.06)', borderColor: 'rgba(15,110,86,0.2)', color: '#0F6E56' }
                              : { background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }
                            }>
                            {fbResult.success ? (
                              <div>
                                {fbResult.scheduled
                                  ? <span>ตั้งเวลาโพสต์สำเร็จ! จะโพสต์วันที่ {scheduleDate} เวลา {scheduleTime}</span>
                                  : <span>โพสต์สำเร็จ!</span>
                                }
                                {fbResult.postId && (
                                  <a href={`https://facebook.com/${fbResult.postId}`} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 ml-2 underline">
                                    ดูโพสต์ <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span>{fbResult.error}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Not configured hint */}
                    {!fbConfigured && (
                      <div className="border-t pt-3 text-xs" style={{ borderColor: 'rgba(196,98,45,0.08)', color: 'var(--text-light)' }}>
                        ต้องการโพสต์ไป Facebook โดยตรง? เพิ่ม FACEBOOK_PAGE_ID และ FACEBOOK_PAGE_ACCESS_TOKEN ใน .env.local
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  )
}
