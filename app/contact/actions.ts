'use server'

import { headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cleanText, isPhone, isEmail } from '@/lib/validate'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export interface InquiryInput {
  name: string
  phone: string
  email?: string
  message?: string
  preferred_date?: string
  property_id?: string
}

export interface InquiryResult {
  ok: boolean
  error?: string
}

// Per-IP fixed window. In-memory only — lost on redeploy, which is fine for
// a low-volume contact form. Replace with Redis/Upstash if traffic grows.
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const buckets = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (b.count >= RATE_LIMIT_MAX) return false
  b.count++
  return true
}

// Periodic GC so the Map does not grow unbounded.
function gc() {
  if (buckets.size < 1000) return
  const now = Date.now()
  buckets.forEach((v, k) => { if (v.resetAt < now) buckets.delete(k) })
}

function clientIp(): string {
  const h = headers()
  // x-forwarded-for can be a comma-separated list; first entry is the client.
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') || 'unknown'
}

export async function submitInquiry(input: InquiryInput): Promise<InquiryResult> {
  gc()

  const ip = clientIp()
  if (!rateLimit(ip)) {
    return { ok: false, error: 'ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' }
  }

  const name = cleanText(input.name, 100)
  const phone = cleanText(input.phone, 20)
  const email = cleanText(input.email, 200)
  const message = cleanText(input.message, 2000)
  const preferredDate = cleanText(input.preferred_date, 10)
  const propertyId = cleanText(input.property_id, 64)

  if (!name) return { ok: false, error: 'กรุณากรอกชื่อ' }
  if (!phone) return { ok: false, error: 'กรุณากรอกเบอร์โทรศัพท์' }
  if (!isPhone(phone)) return { ok: false, error: 'รูปแบบเบอร์โทรไม่ถูกต้อง' }
  if (email && !isEmail(email)) return { ok: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' }
  if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return { ok: false, error: 'รูปแบบวันที่ไม่ถูกต้อง' }
  }
  if (propertyId && !/^[0-9a-fA-F-]{8,40}$/.test(propertyId)) {
    return { ok: false, error: 'property_id ไม่ถูกต้อง' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: 'ระบบยังไม่พร้อม' }

  const cookieStore = cookies()
  const sb = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch { /* RSC can't set cookies — safe to ignore */ }
      },
    },
  })

  // Explicit allowlist — never spread caller input into the insert payload.
  // Defence-in-depth on top of the per-field validation above.
  const INQUIRY_COLUMNS = ['name', 'phone', 'email', 'message', 'preferred_date', 'property_id', 'status'] as const
  const built: Record<string, unknown> = {
    name,
    phone,
    status: 'new',
    ...(email && { email }),
    ...(message && { message }),
    ...(preferredDate && { preferred_date: preferredDate }),
    ...(propertyId && { property_id: propertyId }),
  }
  const payload: Record<string, unknown> = {}
  for (const col of INQUIRY_COLUMNS) {
    if (col in built) payload[col] = built[col]
  }

  const { error } = await sb.from('inquiries').insert([payload])
  if (error) {
    console.error('submitInquiry failed', error)
    return { ok: false, error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }
  }

  return { ok: true }
}
