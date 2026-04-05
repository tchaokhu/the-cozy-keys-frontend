'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'
import { getProperties, MOCK_INQUIRIES } from '@/lib/supabase'
import type { Property } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    getProperties().then(setProperties)
  }, [])

  const available = properties.filter(p => p.status === 'available').length
  const reserved = properties.filter(p => p.status === 'reserved').length
  const newInquiries = MOCK_INQUIRIES.filter(i => i.status === 'new').length
  const totalRevenue = properties
    .filter(p => p.status === 'rented')
    .reduce((sum, p) => sum + p.price_monthly, 0)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ภาพรวม</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/admin/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มทรัพย์
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[
            { label: 'ทรัพย์ว่าง', val: available, icon: '🏠', color: '#0F6E56', bg: 'rgba(135,168,120,0.1)' },
            { label: 'จองแล้ว', val: reserved, icon: '📋', color: '#854F0B', bg: 'rgba(239,159,39,0.1)' },
            { label: 'ติดต่อใหม่', val: newInquiries, icon: '🔔', color: 'var(--terracotta)', bg: 'rgba(196,98,45,0.1)' },
            { label: 'รายได้เช่า/เดือน', val: `฿${totalRevenue.toLocaleString()}`, icon: '💰', color: '#185FA5', bg: 'rgba(55,138,221,0.1)' },
          ].map(({ label, val, icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-5 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: bg }}>{icon}</div>
                <TrendingUp size={14} style={{ color: 'var(--text-light)' }} />
              </div>
              <div className="font-serif text-2xl font-bold mb-0.5" style={{ color }}>{val}</div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Recent inquiries */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--brown)' }}>การติดต่อล่าสุด</h2>
            <Link href="/admin/inquiries" className="text-xs font-medium" style={{ color: 'var(--terracotta)' }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
            {MOCK_INQUIRIES.map(inq => {
              const prop = properties.find(p => p.id === inq.property_id)
              return (
                <div key={inq.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                      {inq.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{inq.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-light)' }}>{prop?.title || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                      {new Date(inq.created_at).toLocaleDateString('th-TH')}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: inq.status === 'new' ? 'rgba(196,98,45,0.1)' : 'rgba(135,168,120,0.15)',
                        color: inq.status === 'new' ? 'var(--terracotta)' : '#0F6E56',
                      }}>
                      {inq.status === 'new' ? 'ใหม่' : 'ติดต่อแล้ว'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
