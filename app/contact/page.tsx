'use client'
import { useState } from 'react'
import { Phone, MessageCircle, MapPin, Clock } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createInquiry } from '@/lib/supabase'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', preferred_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return
    setSubmitting(true)
    try {
      await createInquiry({ property_id: '', ...form })
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
        <div className="px-6 lg:px-16 py-16" style={{ background: 'var(--cream-dark)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--terracotta)' }}>ติดต่อเรา</div>
            <h1 className="font-serif mb-2" style={{ fontSize: 'clamp(28px,4vw,48px)', color: 'var(--brown)' }}>
              พูดคุยกับเรา<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}> ได้เลย</em>
            </h1>
            <p className="font-light" style={{ color: 'var(--text-light)' }}>ปรึกษาฟรี ไม่มีพันธะ</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact info */}
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-8" style={{ color: 'var(--brown)' }}>ช่องทางติดต่อ</h2>
              <div className="flex flex-col gap-5 mb-12">
                {[
                  { icon: <Phone size={18} />, label: 'K. Nut (นัท)', val: '087 670 6436', href: 'tel:0876706436' },
                  { icon: <Phone size={18} />, label: 'K. Dear (เดียร์)', val: '098 091 5461', href: 'tel:0980915461' },
                  { icon: <MessageCircle size={18} />, label: 'LINE Official', val: '@TheCozyKeys', href: '@thecozykeys' },
                  { icon: <MapPin size={18} />, label: 'พื้นที่ให้บริการ', val: 'ศรีราชา · แหลมฉบัง · ชลบุรี', href: null },
                  { icon: <Clock size={18} />, label: 'เวลาทำการ', val: 'จันทร์–อาทิตย์ 08:00–20:00', href: null },
                ].map(({ icon, label, val, href }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                      {icon}
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-light)' }}>{label}</div>
                      {href
                        ? <a href={href} className="font-medium transition-colors" style={{ color: 'var(--brown)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--brown)')}>
                            {val}
                          </a>
                        : <span className="font-medium" style={{ color: 'var(--brown)' }}>{val}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="@thecozykeys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-medium transition-all duration-200"
                style={{ background: '#06C755' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <MessageCircle size={20} />
                เพิ่มเพื่อนทาง LINE
              </a>
            </div>

            {/* Form */}
            <div className="rounded-2xl p-8 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--brown)' }}>ขอบคุณที่ติดต่อ!</h3>
                  <p className="font-light" style={{ color: 'var(--text-light)' }}>เราจะติดต่อกลับภายใน 24 ชั่วโมง</p>
                </div>
              ) : (
                <>
                  <h3 className="font-serif text-xl font-semibold mb-6" style={{ color: 'var(--brown)' }}>ส่งข้อความหาเรา</h3>
                  <div className="flex flex-col gap-4">
                    {[
                      { key: 'name', label: 'ชื่อ-นามสกุล *', placeholder: 'เช่น สมชาย ใจดี', type: 'text' },
                      { key: 'phone', label: 'เบอร์โทรศัพท์ *', placeholder: '08X-XXX-XXXX', type: 'tel' },
                      { key: 'email', label: 'อีเมล (ไม่บังคับ)', placeholder: 'email@example.com', type: 'email' },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-mid)' }}>{label}</label>
                        <input type={type} placeholder={placeholder}
                          value={form[key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                          style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--terracotta)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(196,98,45,0.15)')}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-mid)' }}>ข้อความ / ความต้องการ</label>
                      <textarea rows={4} placeholder="เช่น ต้องการคอนโด 1 ห้องนอน ย่านศรีราชา งบ 12,000/เดือน..."
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
                      className="w-full py-4 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50"
                      style={{ background: 'var(--terracotta)' }}
                    >
                      {submitting ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
