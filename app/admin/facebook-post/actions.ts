'use server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const FB_API = 'https://graph.facebook.com/v25.0'

export async function checkFacebookConfig() {
  return {
    configured: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
  }
}

export interface FBScheduledPost {
  id: string
  message?: string
  scheduled_publish_time?: number | string
  created_time?: string
  is_published?: boolean
  attachments?: {
    data: { media?: { image?: { src: string } }; subattachments?: { data: { media?: { image?: { src: string } } }[] } }[]
  }
}

export interface FBFetchResult {
  posts: FBScheduledPost[]
  error?: string
}

// NOTE: scheduled_posts / promotable_posts endpoints require App in Live Mode
// ตอนนี้ App ยัง dev mode → ดึงได้แค่ /feed (published posts)
// เมื่อเปลี่ยนเป็น Live Mode แล้วสามารถเปิดใช้ scheduled_posts ได้
export async function fetchFacebookScheduledPosts(): Promise<FBFetchResult> {
  return { posts: [] }
}

export async function fetchFacebookPublishedPosts(since?: string, until?: string): Promise<FBFetchResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !accessToken) return { posts: [], error: 'ยังไม่ได้ตั้งค่า Facebook' }

  try {
    // Use /feed instead of /published_posts — more broadly accessible
    let timeParams = ''
    if (since) timeParams += `&since=${since}`
    if (until) timeParams += `&until=${until}`

    const res = await fetch(
      `${FB_API}/${pageId}/feed?fields=id,message,created_time,is_published,attachments&limit=100${timeParams}&access_token=${accessToken}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.error) {
      return { posts: [], error: `FB feed: ${data.error.message} (code: ${data.error.code})` }
    }
    return { posts: ((data.data as FBScheduledPost[]) || []).map(p => ({ ...p, is_published: true })) }
  } catch (e) {
    return { posts: [], error: `fetch feed ล้มเหลว: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function publishToFacebook(
  message: string,
  imageUrls: string[],
  schedule?: { date: string; time: string }
) {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !accessToken) {
    throw new Error('Facebook ยังไม่ได้ตั้งค่า กรุณาเพิ่ม FACEBOOK_PAGE_ID และ FACEBOOK_PAGE_ACCESS_TOKEN ใน .env.local')
  }

  // Filter out data URLs and non-http URLs — Facebook requires public URLs
  const validImageUrls = imageUrls.filter(url => url.startsWith('http://') || url.startsWith('https://'))
  const skipped = imageUrls.length - validImageUrls.length
  if (skipped > 0 && validImageUrls.length === 0) {
    throw new Error('รูปทั้งหมดเป็น data URL ที่ Facebook ไม่รับ — กรุณาตรวจสอบว่า Supabase Storage ตั้งค่าถูกต้อง')
  }

  // Calculate scheduled_publish_time if scheduling
  let scheduledTime: number | undefined
  if (schedule) {
    const dt = new Date(`${schedule.date}T${schedule.time}:00`)
    scheduledTime = Math.floor(dt.getTime() / 1000)
    const now = Math.floor(Date.now() / 1000)
    if (scheduledTime <= now + 600) {
      throw new Error('เวลาที่ตั้งต้องอยู่ในอนาคตอย่างน้อย 10 นาที')
    }
    if (scheduledTime > now + 75 * 24 * 60 * 60) {
      throw new Error('ตั้งเวลาได้ไม่เกิน 75 วันล่วงหน้า')
    }
  }

  // No images — simple text post
  if (validImageUrls.length === 0) {
    const body: Record<string, unknown> = { message, access_token: accessToken }
    if (scheduledTime) {
      body.published = false
      body.scheduled_publish_time = scheduledTime
    }
    const res = await fetch(`${FB_API}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return { success: true as const, postId: data.id as string, scheduled: !!scheduledTime }
  }

  // Multi-photo: upload each as unpublished, then create post
  const mediaIds = await Promise.all(
    validImageUrls.slice(0, 10).map(async (url) => {
      const res = await fetch(`${FB_API}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, published: false, access_token: accessToken }),
      })
      const data = await res.json()
      if (data.error) throw new Error(`อัพโหลดรูปไม่สำเร็จ: ${data.error.message}`)
      return data.id as string
    })
  )

  const postBody: Record<string, unknown> = {
    message,
    attached_media: mediaIds.map(id => ({ media_fbid: id })),
    access_token: accessToken,
  }
  if (scheduledTime) {
    postBody.published = false
    postBody.scheduled_publish_time = scheduledTime
  }

  const res = await fetch(`${FB_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return { success: true as const, postId: data.id as string, scheduled: !!scheduledTime }
}

export async function fetchPropertyInfo(title: string, district: string, province: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const prompt = `คุณคือผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ในประเทศไทย โดยเฉพาะพื้นที่ชลบุรี ศรีราชา แหลมฉบัง

ทรัพย์: "${title}"
ทำเล: ${district}, ${province}

กรุณาตอบเป็น JSON เท่านั้น ไม่มี markdown ไม่มีข้อความอื่น โดยมีโครงสร้างดังนี้:

{
  "facilities": ["รายการ facility ของตึก/คอนโด เช่น สระว่ายน้ำ ฟิตเนส Co-working Space ล็อบบี้ ลิฟต์ กล้องวงจรปิด รปภ.24ชม. ฯลฯ"],
  "nearby": ["ชื่อสถานที่ — ~X.X กม.", ...]
}

กฎ:
1. facilities: ระบุสิ่งอำนวยความสะดวกส่วนกลางของตึก/โครงการนี้ (ไม่ใช่ในห้อง) ถ้าไม่รู้แน่ ให้ใส่ที่น่าจะมีตามประเภท เช่น คอนโดควรมีสระ ฟิตเนส
2. nearby: ระบุเฉพาะสถานที่สำคัญภายใน 5 กม. ได้แก่ โรงพยาบาล ห้างสรรพสินค้า โรงเรียน/มหาวิทยาลัย โรงงานขนาดใหญ่ (นิคมอุตสาหกรรม) ท่าเรือ
3. nearby: ใส่ชื่อจริงของสถานที่นั้น พร้อมระยะทางโดยประมาณเป็นกิโลเมตร
4. nearby: ให้ 4-8 รายการ เรียงจากใกล้ไปไกล
5. ตอบ JSON เท่านั้น ห้ามมี markdown code block`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0 },
  })
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const data = JSON.parse(cleaned)

  return {
    facilities: (data.facilities as string[]) ?? [],
    nearby: (data.nearby as string[]) ?? [],
  }
}
