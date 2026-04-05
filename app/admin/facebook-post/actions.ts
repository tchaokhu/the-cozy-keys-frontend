'use server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
