'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, BedDouble, Bath, Square, CheckCircle2, Phone, MessageCircle, Calendar } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { MOCK_PROPERTIES, createInquiry, getPropertyById } from '@/lib/supabase'
import { Property } from '@/types'

const STATUS_INFO = {
  available: { label: 'ว่างพร้อมเข้าอยู่', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  reserved: { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  rented: { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
}

const TYPE_LABEL = { condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม' }

export default function PropertyDetailPage() {
  const params = useParams()
  const [property, setProperty] = useState<Property | null>(null)
  useEffect(() => {
    getPropertyById(params.id as string).then(setProperty)
  }, [params.id])
  const [activeImg, setActiveImg] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', preferred_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!property) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-25">🏠</div>
            <h1 className="font-serif text-2xl mb-3" style={{ color: 'var(--brown)' }}>ไม่พบทรัพย์นี้</h1>
            <Link href="/listings" className="text-sm" style={{ color: 'var(--terracotta)' }}>
              ← กลับไปดูทรัพย์ทั้งหมด
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const status = STATUS_INFO[property.status]

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return
    setSubmitting(true)
    try {
      await createInquiry({ property_id: property.id, ...form })
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="pt-16">
        {/* Breadcrumb */}
        <div className="px-6 lg:px-16 py-5" style={{ borderBottom: '1px solid rgba(196,98,45,0.1)' }}>
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm" style={{ color: 'var(--text-light)' }}>
            <Link href="/" className="hover:text-terracotta transition-colors" style={{ color: 'inherit' }}>หน้าแรก</Link>
            <span>/</span>
            <Link href="/listings" style={{ color: 'inherit' }}>ทรัพย์ให้เช่า</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)' }}>{property.title}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 text-sm mb-8 transition-colors"
            style={{ color: 'var(--text-light)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
          >
            <ArrowLeft size={14} /> กลับไปดูทรัพย์ทั้งหมด
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* LEFT — main content */}
            <div className="lg:col-span-2">
              {/* Image */}
              <div className="mb-8">
                <div
                  className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    height: 360,
                    background: property.property_type === 'condo'
                      ? 'linear-gradient(135deg,#D4C4A8,#C4A882)'
                      : property.property_type === 'house'
                        ? 'linear-gradient(135deg,#C8D4B8,#A8C498)'
                        : 'linear-gradient(135deg,#D4BCA8,#C49878)',
                  }}
                >
                  {property.images[activeImg]
                    ? <img src={property.images[activeImg]} alt={property.title} className="w-full h-full object-cover" />
                    : <span className="text-8xl opacity-25">
                      {property.property_type === 'condo' ? '🏢' : property.property_type === 'house' ? '🏠' : '🏘️'}
                    </span>
                  }
                </div>
                {property.images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {property.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className="shrink-0 rounded-xl overflow-hidden transition-all"
                        style={{
                          width: 80, height: 60,
                          outline: activeImg === i ? '2px solid var(--terracotta)' : '2px solid transparent',
                          outlineOffset: 2,
                          background: 'var(--cream-dark)',
                        }}
                      >
                        <img src={img} alt={`${property.title} ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title + status */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium mb-3"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </div>
                  <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: 'var(--brown)' }}>
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-light)' }}>
                    <MapPin size={13} /> {property.location}, {property.province}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-3xl font-bold" style={{ color: 'var(--terracotta)' }}>
                    ฿{property.price_monthly.toLocaleString()}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-light)' }}>/เดือน</div>
                </div>
              </div>

              {/* Key specs */}
              <div
                className="grid grid-cols-3 gap-4 p-5 rounded-2xl mb-8"
                style={{ background: 'var(--cream-dark)' }}
              >
                {[
                  { icon: <BedDouble size={18} />, val: `${property.bedrooms} ห้องนอน`, label: 'ห้องนอน' },
                  { icon: <Bath size={18} />, val: `${property.bathrooms} ห้องน้ำ`, label: 'ห้องน้ำ' },
                  { icon: <Square size={18} />, val: `${property.area_sqm} ตร.ม.`, label: 'พื้นที่ใช้สอย' },
                ].map(({ icon, val, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <div style={{ color: 'var(--terracotta)' }}>{icon}</div>
                    <div className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>{val}</div>
                    <div className="text-xs" style={{ color: 'var(--text-light)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {property.description && (
                <div className="mb-8">
                  <h2 className="font-serif text-xl font-semibold mb-3" style={{ color: 'var(--brown)' }}>รายละเอียด</h2>
                  <p className="font-light leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                    {property.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div>
                  <h2 className="font-serif text-xl font-semibold mb-4" style={{ color: 'var(--brown)' }}>สิ่งอำนวยความสะดวก</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map(a => (
                      <div key={a} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-mid)' }}>
                        <CheckCircle2 size={14} style={{ color: 'var(--sage)', flexShrink: 0 }} />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — contact form */}
            <div className="lg:col-span-1">
              <div
                className="rounded-2xl p-6 border sticky top-24"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.12)' }}
              >
                <h3 className="font-serif text-xl font-semibold mb-1" style={{ color: 'var(--brown)' }}>
                  นัดชมทรัพย์
                </h3>
                <p className="text-sm font-light mb-6" style={{ color: 'var(--text-light)' }}>
                  กรอกข้อมูลด้านล่าง เราจะติดต่อกลับโดยเร็ว
                </p>

                {submitted ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <div className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--brown)' }}>
                      รับข้อมูลแล้ว!
                    </div>
                    <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
                      เราจะติดต่อกลับภายใน 24 ชั่วโมง
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {[
                      { key: 'name', label: 'ชื่อ-นามสกุล *', placeholder: 'เช่น สมชาย ใจดี', type: 'text' },
                      { key: 'phone', label: 'เบอร์โทรศัพท์ *', placeholder: '08X-XXX-XXXX', type: 'tel' },
                      { key: 'email', label: 'อีเมล (ไม่บังคับ)', placeholder: 'email@example.com', type: 'email' },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-mid)' }}>
                          {label}
                        </label>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={form[key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                          style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--terracotta)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(196,98,45,0.15)')}
                        />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-mid)' }}>
                        วันที่ต้องการชม
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
                        <input
                          type="date"
                          value={form.preferred_date}
                          onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm border outline-none"
                          style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-mid)' }}>
                        ข้อความเพิ่มเติม
                      </label>
                      <textarea
                        rows={3}
                        placeholder="ต้องการสอบถามเพิ่มเติม หรือมีเงื่อนไขพิเศษ..."
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                        style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--terracotta)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(196,98,45,0.15)')}
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={!form.name || !form.phone || submitting}
                      className="w-full py-4 rounded-xl text-white font-medium text-sm transition-all duration-200 disabled:opacity-50"
                      style={{ background: 'var(--terracotta)' }}
                      onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--terracotta-dark)' }}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--terracotta)')}
                    >
                      {submitting ? 'กำลังส่ง...' : 'นัดชมทรัพย์'}
                    </button>

                    <div className="pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.1)' }}>
                      <p className="text-xs text-center mb-3" style={{ color: 'var(--text-light)' }}>
                        หรือติดต่อโดยตรง
                      </p>
                      <div className="flex gap-2">
                        <a
                          href="tel:0876706436"
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all"
                          style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--brown)' }}
                        >
                          <Phone size={13} /> โทร
                        </a>
                        <a
                          href="https://lin.ee/ZhDShaPc"
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all"
                          style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--brown)' }}
                        >
                          <MessageCircle size={13} /> LINE
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
