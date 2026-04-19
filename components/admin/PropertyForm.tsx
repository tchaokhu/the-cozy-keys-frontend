'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, User, Building2, Sparkles, MapPin, FileText, AlertCircle, Edit2, Ban, Wallet, CheckCircle, Circle } from 'lucide-react'
import { createProperty, updateProperty, getPropertyById, getOwners, getBuildings, getActiveRental, getPaymentsByRental, getPaymentStatus } from '@/lib/supabase'
import type { PropertyType, PropertyStatus, Owner, Building, Property, Rental, Payment, PaymentStatus } from '@/types'
import ImageManager from '@/components/admin/ImageManager'
import AdminSidebar from '@/components/admin/AdminSidebar'
import SearchableSelect from '@/components/admin/SearchableSelect'
import RentalModal, { RentalModalMode } from '@/components/admin/RentalModal'
import PaymentMarkPaidModal from '@/components/admin/PaymentMarkPaidModal'

const DISTRICT_OPTIONS = ['ศรีราชา', 'แหลมฉบัง', 'บ้านบึง']
const PROVINCE_OPTIONS = ['ชลบุรี']

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }
const FIELD_DISABLED_STYLE = { background: '#f5f1ed', borderColor: 'rgba(196,98,45,0.12)', color: 'var(--text-mid)', cursor: 'not-allowed' as const }

interface Props {
  mode: 'new' | 'edit'
  propertyId?: string
}

export default function PropertyForm({ mode, propertyId }: Props) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const [owners, setOwners] = useState<Owner[]>([])
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState('')

  const [activeRental, setActiveRental] = useState<Rental | null>(null)
  const [savedProperty, setSavedProperty] = useState<Property | null>(null)
  const [rentalModalMode, setRentalModalMode] = useState<RentalModalMode | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentModal, setPaymentModal] = useState<Payment | null>(null)

  useEffect(() => {
    getOwners().then(setOwners)
    getBuildings().then(setBuildings)
  }, [])

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    const bld = buildings.find(b => b.id === buildingId)
    if (bld) {
      setForm(f => ({
        ...f,
        title: bld.name,
        title_en: bld.name_en || '',
        district: bld.district || f.district,
        province: bld.province || f.province,
      }))
    } else {
      setForm(f => ({
        ...f,
        title: '',
        title_en: '',
        district: '',
        province: 'ชลบุรี',
      }))
    }
  }

  const [form, setForm] = useState({
    title: '',
    title_en: '',
    description: '',
    price_monthly: '',
    property_type: 'condo' as PropertyType,
    bedrooms: '1',
    bathrooms: '1',
    area_sqm: '',
    floor: '',
    building: '',
    room_number: '',
    location: '',
    district: '',
    province: 'ชลบุรี',
    status: 'available' as PropertyStatus,
    images: [] as string[],
    contact_line: '',
  })

  // Load existing property for edit mode
  useEffect(() => {
    if (!isEdit || !propertyId) return
    Promise.all([getPropertyById(propertyId), getActiveRental(propertyId)]).then(async ([p, r]) => {
      if (!p) { setNotFound(true); setLoading(false); return }
      setForm({
        title: p.title,
        title_en: p.title_en || '',
        description: p.description || '',
        price_monthly: String(p.price_monthly),
        property_type: p.property_type,
        bedrooms: String(p.bedrooms),
        bathrooms: String(p.bathrooms),
        area_sqm: String(p.area_sqm),
        floor: p.floor ? String(p.floor) : '',
        building: p.building || '',
        room_number: p.room_number || '',
        location: p.location,
        district: p.district,
        province: p.province,
        status: p.status,
        images: p.images || [],
        contact_line: p.contact_line || '',
      })
      if (p.owner_id) setSelectedOwnerId(p.owner_id)
      if (p.building_id) setSelectedBuildingId(p.building_id)
      setSavedProperty(p)
      setActiveRental(r)
      if (r) {
        try { setPayments(await getPaymentsByRental(r.id)) }
        catch { setPayments([]) }
      }
      setLoading(false)
    })
  }, [isEdit, propertyId])

  const reloadPayments = async (rentalId: string) => {
    try { setPayments(await getPaymentsByRental(rentalId)) }
    catch { setPayments([]) }
  }

  const reloadActiveRental = async () => {
    if (!propertyId) return
    const r = await getActiveRental(propertyId)
    setActiveRental(r)
    if (r) await reloadPayments(r.id)
    else setPayments([])
    const p = await getPropertyById(propertyId)
    if (p) {
      setSavedProperty(p)
      setForm(f => ({ ...f, status: p.status }))
    }
  }

  const set = (field: string, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  const generateDescription = () => {
    const typeMap: Record<string, string> = { condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม' }
    const typeName = typeMap[form.property_type] || 'ที่พัก'
    const bld = buildings.find(b => b.id === selectedBuildingId)

    const lines: string[] = []

    const namePart = form.building ? ` ${form.building}` : ''
    const projectPart = bld ? ` โครงการ${bld.name}` : ''
    lines.push(`${typeName}${namePart}${projectPart} ให้เช่า`)

    const specs: string[] = []
    if (form.area_sqm) specs.push(`พื้นที่ ${form.area_sqm} ตร.ม.`)
    specs.push(`${form.bedrooms} ห้องนอน ${form.bathrooms} ห้องน้ำ`)
    if (form.floor) specs.push(`ชั้น ${form.floor}`)
    if (form.room_number) specs.push(`ห้อง ${form.room_number}`)
    lines.push(specs.join(' / '))

    if (form.price_monthly) {
      lines.push(`ค่าเช่า ${Number(form.price_monthly).toLocaleString()} บาท/เดือน`)
    }

    set('description', lines.join('\n'))
  }

  const buildPayload = () => ({
    title: form.title,
    title_en: form.title_en || undefined,
    description: form.description || undefined,
    price_monthly: Number(form.price_monthly),
    property_type: form.property_type,
    bedrooms: Number(form.bedrooms),
    bathrooms: Number(form.bathrooms),
    area_sqm: Number(form.area_sqm),
    floor: form.floor ? Number(form.floor) : undefined,
    building: form.building || undefined,
    room_number: form.room_number || undefined,
    location: form.location,
    district: form.district,
    province: form.province,
    status: form.status,
    images: form.images,
    contact_line: form.contact_line || undefined,
    owner_id: selectedOwnerId || undefined,
    building_id: selectedBuildingId || undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title || !form.price_monthly || !form.area_sqm || !form.district) {
      setError('กรุณากรอกข้อมูลที่จำเป็น: ชื่อทรัพย์, ราคา, พื้นที่, เขต/อำเภอ')
      return
    }
    if (form.status === 'rented' && !activeRental) {
      setError('สถานะ "เช่าแล้ว" ต้องมีสัญญาเช่าก่อน — กรุณาสร้างสัญญาในหัวข้อ "สัญญาเช่า"')
      return
    }
    setSaving(true)
    try {
      if (isEdit && propertyId) {
        await updateProperty(propertyId, buildPayload())
      } else {
        await createProperty(buildPayload())
      }
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

      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/properties"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-mid)' }}>
            <ArrowLeft size={16} /> กลับ
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>
              {isEdit ? 'แก้ไขทรัพย์' : 'เพิ่มทรัพย์ใหม่'}
            </h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {isEdit ? 'อัปเดตข้อมูลทรัพย์' : 'กรอกข้อมูลทรัพย์ที่ต้องการเพิ่ม'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm" style={{ color: 'var(--text-light)' }}>กำลังโหลด...</div>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-sm" style={{ color: 'var(--text-mid)' }}>ไม่พบทรัพย์นี้</p>
            <Link href="/admin/properties" className="text-sm font-medium" style={{ color: 'var(--terracotta)' }}>
              กลับไปรายการทรัพย์
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">

            {/* Building — first so it can auto-fill other fields */}
            <section className="rounded-2xl border p-6 space-y-4"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} style={{ color: 'var(--terracotta)' }} />
                  <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ตึก/โครงการ</h2>
                </div>
                <Link href="/admin/buildings" target="_blank"
                  className="text-xs" style={{ color: 'var(--terracotta)' }}>
                  + จัดการโครงการ
                </Link>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เลือกโครงการ</label>
                <SearchableSelect
                  value={selectedBuildingId}
                  onChange={handleBuildingChange}
                  placeholder="— เลือกโครงการ —"
                  emptyLabel="— ไม่ระบุโครงการ —"
                  searchPlaceholder="ค้นหาชื่อโครงการ, ทำเล..."
                  options={buildings.map(b => ({ value: b.id, label: `${b.name}${b.name_en ? ` (${b.name_en})` : ''}` }))}
                />
              </div>
              {selectedBuildingId && (() => {
                const bld = buildings.find(b => b.id === selectedBuildingId)
                if (!bld) return null
                return (
                  <div className="text-xs rounded-xl px-4 py-3 space-y-2"
                    style={{ background: 'rgba(196,98,45,0.04)', color: 'var(--text-mid)' }}>
                    <p><span className="font-medium">ชื่อโครงการ:</span> {bld.name}{bld.name_en ? ` (${bld.name_en})` : ''}</p>
                    {bld.facilities.length > 0 && (
                      <p><span className="font-medium">สิ่งอำนวยความสะดวก:</span> {bld.facilities.join(', ')}</p>
                    )}
                    {bld.google_map_url && (
                      <a href={bld.google_map_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                        style={{ color: 'white', background: 'var(--terracotta)' }}>
                        📍 เปิด Google Maps ↗
                      </a>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Basic info */}
            <section className="rounded-2xl border p-6 space-y-4"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ข้อมูลทั่วไป</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    ชื่อทรัพย์ (ภาษาไทย) <span style={{ color: 'var(--terracotta)' }}>*</span>
                  </label>
                  <input className={FIELD} style={selectedBuildingId ? FIELD_DISABLED_STYLE : FIELD_STYLE} value={form.title}
                    disabled={!!selectedBuildingId}
                    onChange={e => set('title', e.target.value)} placeholder="เช่น คอนโด Rhythm Sukhumvit 42" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    ชื่อทรัพย์ (ภาษาอังกฤษ)
                  </label>
                  <input className={FIELD} style={selectedBuildingId ? FIELD_DISABLED_STYLE : FIELD_STYLE} value={form.title_en}
                    disabled={!!selectedBuildingId}
                    onChange={e => set('title_en', e.target.value)} placeholder="e.g. Rhythm Sukhumvit 42 Condo" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-mid)' }}>รายละเอียด</label>
                    <button type="button" onClick={generateDescription}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                      style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                      <Sparkles size={12} /> สร้างอัตโนมัติ
                    </button>
                  </div>
                  <textarea className={FIELD} style={FIELD_STYLE} rows={6} value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder={"กดปุ่ม \"สร้างอัตโนมัติ\" เพื่อสร้างจากข้อมูลที่กรอก\nหรือพิมพ์เอง เช่น:\n- สภาพห้อง, เฟอร์นิเจอร์\n- จุดเด่น, วิว\n- เงื่อนไขการเช่า"} />
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
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ตึก/อาคาร</label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.building}
                    onChange={e => set('building', e.target.value)} placeholder="เช่น Tower A" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ชั้น</label>
                  <input type="number" min="1" className={FIELD} style={FIELD_STYLE} value={form.floor}
                    onChange={e => set('floor', e.target.value)} placeholder="เช่น 15" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เลขห้อง</label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.room_number}
                    onChange={e => set('room_number', e.target.value)} placeholder="เช่น 1502" />
                </div>
              </div>
            </section>

            {/* Rental Contract */}
            {isEdit && savedProperty && (
              <section className="rounded-2xl border p-6 space-y-4"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: 'var(--terracotta)' }} />
                  <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>สัญญาเช่า</h2>
                </div>

                {activeRental ? (
                  <div className="rounded-xl border p-4 space-y-3"
                    style={{ background: 'rgba(196,98,45,0.04)', borderColor: 'rgba(196,98,45,0.15)' }}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-light)' }}>ผู้เช่า</p>
                        <p className="font-medium" style={{ color: 'var(--text-dark)' }}>{activeRental.tenant_name_snapshot}</p>
                        {activeRental.tenant_phone_snapshot && (
                          <p className="text-xs" style={{ color: 'var(--text-mid)' }}>{activeRental.tenant_phone_snapshot}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-light)' }}>ค่าเช่า/เดือน</p>
                        <p className="font-medium" style={{ color: 'var(--text-dark)' }}>
                          {Number(activeRental.monthly_rent).toLocaleString()} บาท
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-light)' }}>ระยะเวลา</p>
                        <p className="text-sm" style={{ color: 'var(--text-dark)' }}>
                          {activeRental.start_date} → {activeRental.end_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-light)' }}>เช่าผ่านเรา</p>
                        <p className="text-sm" style={{ color: 'var(--text-dark)' }}>
                          {activeRental.rented_by_us ? 'ใช่' : 'ไม่ใช่'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setRentalModalMode('edit')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: 'rgba(196,98,45,0.3)', color: 'var(--terracotta)', background: 'white' }}>
                        <Edit2 size={12} /> แก้ไขสัญญา
                      </button>
                      <button type="button" onClick={() => setRentalModalMode('end')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ background: '#dc2626' }}>
                        <Ban size={12} /> ปิดสัญญา
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.status === 'rented' && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                        style={{ background: 'rgba(239,159,39,0.1)', color: '#854F0B' }}>
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>สถานะ &quot;เช่าแล้ว&quot; ต้องมีสัญญาเช่า — กรุณาสร้างสัญญาก่อนบันทึก</span>
                      </div>
                    )}
                    <button type="button" onClick={() => setRentalModalMode('create')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                      style={{ background: 'var(--terracotta)' }}>
                      <Plus size={14} /> สร้างสัญญาเช่า
                    </button>
                  </div>
                )}
              </section>
            )}

            {isEdit && !savedProperty && !loading && null}

            {/* Payment Schedule */}
            {isEdit && savedProperty && activeRental && (
              <section className="rounded-2xl border p-6 space-y-4"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} style={{ color: 'var(--terracotta)' }} />
                    <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ประวัติการชำระ</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--terracotta)' }}>
                      {payments.length} งวด
                    </span>
                  </div>
                  <Link href="/admin/payments" className="text-xs font-medium" style={{ color: 'var(--terracotta)' }}>
                    ดูทั้งหมด →
                  </Link>
                </div>

                {payments.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-light)' }}>ยังไม่มีรายการชำระ</p>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
                    {payments.map(pay => {
                      const status: PaymentStatus = getPaymentStatus(pay)
                      const statusColor = status === 'paid' ? '#0F6E56'
                        : status === 'partial' ? '#854F0B'
                        : status === 'overdue' ? '#A32D2D'
                        : 'var(--text-light)'
                      const typeLabel = pay.type === 'rent' ? 'ค่าเช่า'
                        : pay.type === 'deposit' ? 'เงินประกัน'
                        : pay.type === 'commission' ? 'ค่านายหน้า' : 'อื่นๆ'
                      const dueText = new Date(pay.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                      return (
                        <div key={pay.id}
                          className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                          style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
                          {status === 'paid' ? (
                            <CheckCircle size={16} style={{ color: '#0F6E56' }} />
                          ) : (
                            <Circle size={16} style={{ color: statusColor }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium" style={{ color: 'var(--text-dark)' }}>{dueText}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(196,98,45,0.06)', color: 'var(--text-mid)' }}>
                                {typeLabel}
                              </span>
                            </div>
                            {pay.paid_date && (
                              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                                จ่าย {new Date(pay.paid_date).toLocaleDateString('th-TH')}
                                {pay.method && ` · ${pay.method === 'transfer' ? 'โอน' : pay.method === 'cash' ? 'เงินสด' : 'อื่นๆ'}`}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
                              ฿{pay.amount.toLocaleString()}
                            </div>
                            {status === 'partial' && (
                              <div className="text-[10px]" style={{ color: '#854F0B' }}>
                                จ่ายแล้ว ฿{(pay.paid_amount ?? 0).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => setPaymentModal(pay)}
                            className="text-xs px-2 py-1 rounded-lg border shrink-0"
                            style={{ borderColor: 'rgba(196,98,45,0.2)', color: status === 'paid' ? 'var(--text-light)' : 'var(--terracotta)' }}>
                            {status === 'paid' ? 'แก้ไข' : 'บันทึก'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Location */}
            <section className="rounded-2xl border p-6 space-y-4"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-center gap-2">
                <MapPin size={16} style={{ color: 'var(--terracotta)' }} />
                <h2 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ที่ตั้ง</h2>
              </div>
              {(() => {
                const bld = buildings.find(b => b.id === selectedBuildingId)
                const locked = !!(bld && bld.district)
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                        เขต/อำเภอ <span style={{ color: 'var(--terracotta)' }}>*</span>
                      </label>
                      <select className={FIELD} style={locked ? FIELD_DISABLED_STYLE : FIELD_STYLE} value={form.district}
                        disabled={locked}
                        onChange={e => set('district', e.target.value)}>
                        <option value="">— เลือกเขต/อำเภอ —</option>
                        {DISTRICT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>จังหวัด</label>
                      <select className={FIELD} style={locked ? FIELD_DISABLED_STYLE : FIELD_STYLE} value={form.province}
                        disabled={locked}
                        onChange={e => set('province', e.target.value)}>
                        {PROVINCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {locked && (
                      <p className="col-span-2 text-[11px]" style={{ color: 'var(--text-light)' }}>
                        ดึงจากโครงการ {bld!.name} อัตโนมัติ — แก้ไขได้ที่หน้าจัดการโครงการ
                      </p>
                    )}
                  </div>
                )
              })()}
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
                <SearchableSelect
                  value={selectedOwnerId}
                  onChange={setSelectedOwnerId}
                  placeholder="— เลือกเจ้าของ —"
                  emptyLabel="— ไม่ระบุเจ้าของ —"
                  searchPlaceholder="ค้นหาชื่อ, เบอร์โทร..."
                  options={owners.map(o => ({ value: o.id, label: o.name, sub: o.phone || undefined }))}
                />
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
                {isEdit
                  ? <><Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</>
                  : <><Plus size={15} /> {saving ? 'กำลังบันทึก...' : 'เพิ่มทรัพย์'}</>
                }
              </button>
            </div>
          </form>
        )}

        {rentalModalMode && savedProperty && (
          <RentalModal
            mode={rentalModalMode}
            property={savedProperty}
            rental={activeRental || undefined}
            onClose={() => setRentalModalMode(null)}
            onSaved={async () => {
              setRentalModalMode(null)
              await reloadActiveRental()
            }}
          />
        )}

        {paymentModal && activeRental && (
          <PaymentMarkPaidModal
            payment={paymentModal}
            onClose={() => setPaymentModal(null)}
            onSaved={async () => {
              setPaymentModal(null)
              await reloadPayments(activeRental.id)
            }}
          />
        )}
      </main>
    </div>
  )
}
