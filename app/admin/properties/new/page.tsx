'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, User } from 'lucide-react'
import { createProperty, getOwners } from '@/lib/supabase'
import type { PropertyType, PropertyStatus, Owner } from '@/types'
import ImageManager from '@/components/admin/ImageManager'
import AdminSidebar from '@/components/admin/AdminSidebar'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

export default function NewPropertyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [owners, setOwners] = useState<Owner[]>([])
  const [selectedOwnerId, setSelectedOwnerId] = useState('')

  useEffect(() => {
    getOwners().then(setOwners)
  }, [])

  const [form, setForm] = useState({
    title: '',
    title_en: '',
    description: '',
    price_monthly: '',
    property_type: 'condo' as PropertyType,
    bedrooms: '1',
    bathrooms: '1',
    area_sqm: '',
    location: '',
    district: '',
    province: 'กรุงเทพมหานคร',
    status: 'available' as PropertyStatus,
    images: [] as string[],
    contact_line: '',
  })

  const set = (field: string, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title || !form.price_monthly || !form.area_sqm || !form.district) {
      setError('กรุณากรอกข้อมูลที่จำเป็น: ชื่อทรัพย์, ราคา, พื้นที่, เขต/อำเภอ')
      return
    }
    setSaving(true)
    try {
      await createProperty({
        title: form.title,
        title_en: form.title_en || undefined,
        description: form.description || undefined,
        price_monthly: Number(form.price_monthly),
        property_type: form.property_type,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area_sqm: Number(form.area_sqm),
        location: form.location,
        district: form.district,
        province: form.province,
        status: form.status,
        images: form.images,
        contact_line: form.contact_line || undefined,
        owner_id: selectedOwnerId || undefined,
      })
      router.push('/admin/properties')
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/properties"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-mid)' }}>
            <ArrowLeft size={16} /> กลับ
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>เพิ่มทรัพย์ใหม่</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>กรอกข้อมูลทรัพย์ที่ต้องการเพิ่ม</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">

          {/* Basic info */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ข้อมูลทั่วไป</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ชื่อทรัพย์ (ภาษาไทย) <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input className={FIELD} style={FIELD_STYLE} value={form.title}
                  onChange={e => set('title', e.target.value)} placeholder="เช่น คอนโด Rhythm Sukhumvit 42" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ชื่อทรัพย์ (ภาษาอังกฤษ)
                </label>
                <input className={FIELD} style={FIELD_STYLE} value={form.title_en}
                  onChange={e => set('title_en', e.target.value)} placeholder="e.g. Rhythm Sukhumvit 42 Condo" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>รายละเอียด</label>
                <textarea className={FIELD} style={FIELD_STYLE} rows={4} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="รายละเอียดของทรัพย์..." />
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>รายละเอียดทรัพย์</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ราคาเช่า/เดือน (บาท) <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input type="number" min="0" className={FIELD} style={FIELD_STYLE} value={form.price_monthly}
                  onChange={e => set('price_monthly', e.target.value)} placeholder="15000" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  พื้นที่ (ตร.ม.) <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input type="number" min="0" className={FIELD} style={FIELD_STYLE} value={form.area_sqm}
                  onChange={e => set('area_sqm', e.target.value)} placeholder="35" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ประเภทที่พัก</label>
                <select className={FIELD} style={FIELD_STYLE} value={form.property_type}
                  onChange={e => set('property_type', e.target.value)}>
                  <option value="condo">คอนโด</option>
                  <option value="house">บ้านเดี่ยว</option>
                  <option value="townhome">ทาวน์โฮม</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>สถานะ</label>
                <select className={FIELD} style={FIELD_STYLE} value={form.status}
                  onChange={e => set('status', e.target.value)}>
                  <option value="available">ว่าง</option>
                  <option value="reserved">จองแล้ว</option>
                  <option value="rented">เช่าแล้ว</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>จำนวนห้องนอน</label>
                <select className={FIELD} style={FIELD_STYLE} value={form.bedrooms}
                  onChange={e => set('bedrooms', e.target.value)}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ห้อง</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>จำนวนห้องน้ำ</label>
                <select className={FIELD} style={FIELD_STYLE} value={form.bathrooms}
                  onChange={e => set('bathrooms', e.target.value)}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} ห้อง</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ที่ตั้ง</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ที่อยู่</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.location}
                  onChange={e => set('location', e.target.value)} placeholder="เช่น 123 ซอยสุขุมวิท 42" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    เขต/อำเภอ <span style={{ color: 'var(--terracotta)' }}>*</span>
                  </label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.district}
                    onChange={e => set('district', e.target.value)} placeholder="เช่น พระโขนง" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>จังหวัด</label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.province}
                    onChange={e => set('province', e.target.value)} placeholder="กรุงเทพมหานคร" />
                </div>
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>รูปภาพ</h2>
            <ImageManager images={form.images} onChange={imgs => set('images', imgs)} />
          </section>

          {/* Owner */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} style={{ color: 'var(--terracotta)' }} />
                <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>เจ้าของทรัพย์</h2>
              </div>
              <Link href="/admin/owners" target="_blank"
                className="text-xs" style={{ color: 'var(--terracotta)' }}>
                + จัดการเจ้าของ
              </Link>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เลือกเจ้าของ</label>
              <select className={FIELD} style={FIELD_STYLE}
                value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)}>
                <option value="">— ไม่ระบุเจ้าของ —</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.phone ? ` (${o.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ข้อมูลติดต่อ</h2>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>LINE ID</label>
              <input className={FIELD} style={FIELD_STYLE} value={form.contact_line}
                onChange={e => set('contact_line', e.target.value)} placeholder="@thecozykeys" />
            </div>
          </section>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl border"
              style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.06)', borderColor: 'rgba(226,75,74,0.2)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pb-8">
            <Link href="/admin/properties"
              className="px-6 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)', background: 'white' }}>
              ยกเลิก
            </Link>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--terracotta)' }}>
              <Plus size={15} /> {saving ? 'กำลังบันทึก...' : 'เพิ่มทรัพย์'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
