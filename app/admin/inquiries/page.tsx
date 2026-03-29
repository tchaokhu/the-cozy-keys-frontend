'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Phone, MessageCircle, Home, Bell, BarChart2 } from 'lucide-react'
import { MOCK_INQUIRIES, getProperties } from '@/lib/supabase'
import type { Property } from '@/types'

const STATUS_STYLE = {
  new: { label: 'ใหม่', color: 'var(--terracotta)', bg: 'rgba(196,98,45,0.1)' },
  contacted: { label: 'ติดต่อแล้ว', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  closed: { label: 'ปิดแล้ว', color: 'var(--text-light)', bg: 'rgba(107,68,35,0.08)' },
}

const NAV = [
  { icon: <BarChart2 size={18} />, label: 'ภาพรวม', href: '/admin/dashboard' },
  { icon: <Home size={18} />, label: 'ทรัพย์ทั้งหมด', href: '/admin/properties' },
  { icon: <Bell size={18} />, label: 'การติดต่อ', href: '/admin/inquiries' },
]

export default function AdminInquiries() {
  const [properties, setProperties] = useState<Property[]>([])
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    getProperties().then(setProperties)
  }, [])

  const filtered = statusFilter
    ? MOCK_INQUIRIES.filter(i => i.status === statusFilter)
    : MOCK_INQUIRIES

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <aside className="w-64 shrink-0 border-r flex flex-col"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', minHeight: '100vh' }}>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
          <div className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>
            The Cozy <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>Keys</em>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>Admin Panel</div>
        </div>
        <nav className="p-4 flex flex-col gap-1 flex-1">
          {NAV.map(({ icon, label, href }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ color: href === '/admin/inquiries' ? 'var(--terracotta)' : 'var(--text-mid)',
                background: href === '/admin/inquiries' ? 'rgba(196,98,45,0.08)' : 'transparent' }}>
              {icon} {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-center w-full"
            style={{ background: 'var(--terracotta)', color: 'white' }}>
            <Eye size={16} /> ดูหน้าเว็บ
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>การติดต่อ</h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
            {MOCK_INQUIRIES.filter(i => i.status === 'new').length} รายการใหม่
          </p>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-6">
          {[
            { val: '', label: 'ทั้งหมด' },
            { val: 'new', label: 'ใหม่' },
            { val: 'contacted', label: 'ติดต่อแล้ว' },
            { val: 'closed', label: 'ปิดแล้ว' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: statusFilter === val ? 'var(--terracotta)' : 'white',
                borderColor: statusFilter === val ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                color: statusFilter === val ? 'white' : 'var(--text-mid)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4">
          {filtered.map(inq => {
            const prop = properties.find(p => p.id === inq.property_id)
            const s = STATUS_STYLE[inq.status]
            return (
              <div key={inq.id} className="rounded-2xl border p-5"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                      style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                      {inq.name[0]}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-dark)' }}>{inq.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-light)' }}>{inq.phone}</div>
                      {inq.email && <div className="text-xs" style={{ color: 'var(--text-light)' }}>{inq.email}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                      {new Date(inq.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {prop && (
                  <div className="mt-3 px-3 py-2 rounded-xl text-sm flex items-center justify-between"
                    style={{ background: 'var(--cream-dark)' }}>
                    <span style={{ color: 'var(--text-mid)' }}>ทรัพย์: {prop.title}</span>
                    <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
                      ฿{prop.price_monthly.toLocaleString()}/เดือน
                    </span>
                  </div>
                )}

                {inq.message && (
                  <p className="mt-3 text-sm font-light leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                    "{inq.message}"
                  </p>
                )}

                {inq.preferred_date && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-light)' }}>
                    วันที่นัดชม: {new Date(inq.preferred_date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <a href={`tel:${inq.phone.replace(/-/g, '')}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--brown)' }}>
                    <Phone size={13} /> โทร {inq.phone}
                  </a>
                  <a href="https://lin.ee/ZhDShaPc"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--brown)' }}>
                    <MessageCircle size={13} /> LINE
                  </a>
                  {inq.status === 'new' && (
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white"
                      style={{ background: 'var(--terracotta)' }}>
                      ทำเครื่องหมาย: ติดต่อแล้ว
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
