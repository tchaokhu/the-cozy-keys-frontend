'use client'
import Link from 'next/link'
import { ArrowRight, Phone, MessageCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PropertyCard from '@/components/ui/PropertyCard'
import { getProperties } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'
import { Property } from '@/types'

const MARQUEE_ITEMS = [
  'คอนโดให้เช่า', 'บ้านเดี่ยว', 'ทาวน์โฮม',
  'ศรีราชา', 'แหลมฉบัง', 'ชลบุรี',
  'The Cozy Keys', 'ดูแลครบ จบในที่เดียว',
]

export default function HomePage() {
  const revealRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const [featured, setFeatured] = useState<Property[]>([])

  useEffect(() => {
    getProperties({ status: 'available' })
      .then(data => setFeatured(data.slice(0, 3)))
  }, [])

  return (
    <>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 pt-16">
        {/* Left */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-20">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-widest uppercase mb-8 w-fit"
            style={{
              background: 'rgba(135,168,120,0.15)',
              border: '1px solid rgba(135,168,120,0.35)',
              color: '#3B6D11',
              animationDelay: '0s',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sage)' }} />
            ศรีราชา · แหลมฉบัง · ชลบุรี
          </div>

          <h1
            className="font-serif leading-none mb-6"
            style={{
              fontSize: 'clamp(44px,5.5vw,72px)',
              color: 'var(--brown)',
            }}
          >
            ค้นหาบ้านเช่า<br />
            ที่<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>ใช่สำหรับคุณ</em>
          </h1>

          <p
            className="text-lg font-light leading-relaxed mb-12 max-w-lg"
            style={{ color: 'var(--text-mid)' }}
          >
            The Cozy Keys ดูแลทุกรายละเอียด ตั้งแต่การค้นหา ไปจนถึงวันที่คุณย้ายเข้า
            คอนโด บ้าน ทาวน์โฮม ในย่านศรีราชา-แหลมฉบัง
          </p>

          <div className="flex flex-wrap gap-4 items-center mb-16">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-medium transition-all duration-200"
              style={{ background: 'var(--terracotta)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--terracotta-dark)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(196,98,45,0.35)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--terracotta)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              ดูทรัพย์ทั้งหมด <ArrowRight size={16} />
            </Link>
            <a
              href="tel:0876706436"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-medium transition-all duration-200"
              style={{ color: 'var(--brown)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(107,68,35,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Phone size={15} /> โทรปรึกษาฟรี
            </a>
          </div>
        </div>

        {/* Right — hero visual */}
        <div className="relative hidden lg:block" style={{ background: 'var(--cream-dark)', minHeight: 600 }}>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#EDE6D6 0%,#D4C4A8 40%,#C4A882 100%)' }}
          >
            <span className="text-9xl opacity-20">🏠</span>
          </div>

          {/* Floating card */}
          <div
            className="absolute bottom-12 -left-8 rounded-2xl p-5 min-w-56"
            style={{
              background: 'white',
              boxShadow: '0 20px 48px rgba(44,24,16,0.15)',
            }}
          >
            <div
              className="absolute top-4 right-4 w-2 h-2 rounded-full pulse-dot"
              style={{ background: 'var(--sage)' }}
            />
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-light)' }}>
              ว่างพร้อมเข้าอยู่
            </div>
            <div className="font-serif font-semibold mb-1" style={{ color: 'var(--brown)' }}>
              Notting Hill Laemchabang
            </div>
            <div className="font-serif text-xl font-bold" style={{ color: 'var(--terracotta)' }}>
              ฿12,000 <span className="text-xs font-sans font-normal" style={{ color: 'var(--text-light)' }}>/เดือน</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────── */}
      <div className="overflow-hidden py-3.5" style={{ background: 'var(--terracotta)' }}>
        <div className="flex whitespace-nowrap marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 px-8 text-xs font-medium tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {item}
              <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.4)' }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── LISTINGS PREVIEW ────────────────────────────────────── */}
      <section className="px-6 lg:px-16 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 reveal">
            <div>
              <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--terracotta)' }}>
                ทรัพย์แนะนำ
              </div>
              <h2 className="font-serif leading-tight mb-3" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: 'var(--brown)' }}>
                พร้อมให้เช่า<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}> เดี๋ยวนี้</em>
              </h2>
              <p className="font-light text-base max-w-md" style={{ color: 'var(--text-light)' }}>
                คัดสรรทรัพย์คุณภาพ ทำเลดี ใกล้นิคมอุตสาหกรรมและสิ่งอำนวยความสะดวก
              </p>
            </div>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium shrink-0 transition-all duration-200"
              style={{ background: 'var(--terracotta)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--terracotta-dark)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--terracotta)')}
            >
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 reveal reveal-delay-1">
            {featured.map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ──────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6 lg:px-16 relative overflow-hidden" style={{ background: 'var(--brown)' }}>
        <div
          className="absolute top-0 left-0 font-serif pointer-events-none select-none leading-none"
          style={{ fontSize: 320, color: 'rgba(255,255,255,0.03)', top: -60, left: 20 }}
        >
          "
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="reveal mb-14">
            <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--sage-light)' }}>
              ทำไมต้องเลือกเรา
            </div>
            <h2 className="font-serif leading-tight" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: 'var(--cream)' }}>
              บริการที่<em style={{ color: 'var(--terracotta-light)', fontStyle: 'italic' }}>ดูแล</em>
              <br />คุณทุกขั้นตอน
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal reveal-delay-1">
            {[
              { icon: '🔑', title: 'ทรัพย์คุณภาพ คัดสรรแล้ว', text: 'ตรวจสอบทุกรายการก่อนนำลิสต์ ทั้งสภาพห้อง สัญญา และเจ้าของ เพื่อให้คุณมั่นใจได้' },
              { icon: '📍', title: 'รู้จักพื้นที่ดีที่สุด', text: 'เชี่ยวชาญย่านศรีราชา-แหลมฉบัง รู้ทุกโครงการ ทุกราคา ช่วยให้คุณตัดสินใจได้ถูกต้อง' },
              { icon: '💬', title: 'ตอบไว ดูแลจริง', text: 'ติดต่อได้ทาง LINE ตอบรวดเร็ว นัดชมสะดวก ไม่ต้องรอนาน พร้อมให้คำปรึกษาฟรีตลอด' },
              { icon: '🤝', title: 'ไม่มีค่าใช้จ่ายสำหรับผู้เช่า', text: 'ใช้บริการเราได้ฟรี ไม่มีค่านายหน้าสำหรับฝั่งผู้เช่า เราได้รับค่าตอบแทนจากเจ้าของทรัพย์' },
            ].map(({ icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl p-9 border transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                  style={{ background: 'rgba(196,98,45,0.25)' }}
                >
                  {icon}
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3" style={{ color: 'var(--cream)' }}>
                  {title}
                </h3>
                <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(245,240,232,0.6)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AREAS ───────────────────────────────────────────────── */}
      <section id="areas" className="py-24 px-6 lg:px-16" style={{ background: 'var(--cream-dark)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-14">
            <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--terracotta)' }}>
              พื้นที่ให้บริการ
            </div>
            <h2 className="font-serif leading-tight" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: 'var(--brown)' }}>
              ครอบคลุมทุก<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>ทำเล</em>
              <br />ในชลบุรี
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 reveal reveal-delay-1">
            {[
              { name: 'ศรีราชา', count: 5, pct: 75 },
              { name: 'แหลมฉบัง', count: 3, pct: 45 },
              { name: 'บ้านบึง', count: 2, pct: 30 },
              { name: 'พัทยา', count: 0, pct: 8 },
            ].map(({ name, count, pct }) => (
              <Link
                key={name}
                href={`/listings?district=${encodeURIComponent(name)}`}
                className="block p-6 rounded-2xl border transition-all duration-300"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--terracotta)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(196,98,45,0.1)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div className="font-serif text-xl font-semibold mb-1" style={{ color: 'var(--brown)' }}>
                  {name}
                </div>
                <div className="text-sm mb-4" style={{ color: 'var(--text-light)' }}>
                  {count > 0 ? `${count} ทรัพย์พร้อมเช่า` : 'กำลังขยาย'}
                </div>
                <div className="h-1 rounded-full" style={{ background: 'var(--cream-dark)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: 'var(--terracotta)' }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-16 text-center reveal">
        <div className="max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest mb-4 font-medium" style={{ color: 'var(--terracotta)' }}>
            ติดต่อเรา
          </div>
          <h2 className="font-serif leading-tight mb-4" style={{ fontSize: 'clamp(28px,3.5vw,44px)', color: 'var(--brown)' }}>
            พร้อมช่วยคุณ<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}> ทุกวัน</em>
          </h2>
          <p className="font-light mb-10" style={{ color: 'var(--text-light)' }}>
            ปรึกษาฟรี ไม่มีพันธะ บอกความต้องการ แล้วเราจะหาทรัพย์ที่ใช่ให้คุณ
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[
              { icon: <Phone size={15} />, label: 'K. Nut 087 670 6436', href: 'tel:0876706436' },
              { icon: <Phone size={15} />, label: 'K. Dear 098 091 5461', href: 'tel:0980915461' },
              { icon: <MessageCircle size={15} />, label: 'LINE: The Cozy Keys', href: 'https://lin.ee/ZhDShaPc' },
            ].map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium border transition-all duration-200"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--brown)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--terracotta)'
                  e.currentTarget.style.background = 'rgba(196,98,45,0.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(196,98,45,0.2)'
                  e.currentTarget.style.background = 'white'
                }}
              >
                {icon} {label}
              </a>
            ))}
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-full text-white font-medium text-base transition-all duration-200"
            style={{ background: 'var(--terracotta)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--terracotta-dark)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(196,98,45,0.35)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--terracotta)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            ส่งข้อความ LINE ได้เลย <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
