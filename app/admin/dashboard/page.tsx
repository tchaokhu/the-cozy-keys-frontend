'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, AlertTriangle, Clock, BarChart3 } from 'lucide-react'
import { getProperties, getInquiries, getRentalStatus, getPayments, getPaymentStatus, expireOverdueRentals } from '@/lib/supabase'
import type { Property, Inquiry, Payment } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

type RangeMonths = 6 | 12 | 24

function buildCommissionSeries(payments: Payment[], months: RangeMonths) {
  // Build month buckets ending with current month (Asia/Bangkok local)
  const now = new Date()
  const buckets: { key: string; label: string; total: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
    buckets.push({ key, label, total: 0 })
  }
  const map = new Map(buckets.map(b => [b.key, b]))
  for (const p of payments) {
    if (p.type !== 'commission') continue
    const amount = p.paid_amount ?? 0
    if (amount <= 0) continue
    const dateStr = p.paid_date ?? p.due_date
    if (!dateStr) continue
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const b = map.get(key)
    if (b) b.total += amount
  }
  return buckets
}

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeMonths>(12)

  useEffect(() => {
    // Run rental auto-expire once per admin session before pulling stats so
    // dashboard counts reflect today's state.
    expireOverdueRentals()
      .catch(e => console.warn('expireOverdueRentals failed:', e))
      .then(() => Promise.all([getProperties(), getInquiries(), getPayments()]))
      .then(([p, i, pay]) => {
        setProperties(p)
        setInquiries(i)
        setPayments(pay)
        setLoading(false)
      })
  }, [])

  const available = properties.filter(p => p.status === 'available').length
  const reserved = properties.filter(p => p.status === 'reserved').length
  const newInquiries = inquiries.filter(i => i.status === 'new').length

  // Revenue = paid commission this month
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalRevenue = payments.reduce((sum, p) => {
    if (p.type !== 'commission') return sum
    const amt = p.paid_amount ?? 0
    if (amt <= 0) return sum
    const d = new Date(p.paid_date ?? p.due_date ?? 0)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return key === thisMonthKey ? sum + amt : sum
  }, 0)

  const series = useMemo(() => buildCommissionSeries(payments, range), [payments, range])
  const maxVal = Math.max(1, ...series.map(s => s.total))
  const seriesTotal = series.reduce((s, b) => s + b.total, 0)

  const paymentsWithStatus = payments.map(p => ({ p, status: getPaymentStatus(p) }))
  const overduePayments = paymentsWithStatus.filter(x => x.status === 'overdue' || x.status === 'partial')
  const overdueTotal = overduePayments.reduce((sum, x) => sum + (x.p.amount - (x.p.paid_amount ?? 0)), 0)
  const overdueCount = overduePayments.length

  const rentedWithExpiry = properties
    .filter(p => p.status === 'rented' && p.active_rental?.end_date)
    .map(p => ({ p, ...getRentalStatus(p.active_rental?.end_date) }))
  const expiring = rentedWithExpiry
    .filter(x => x.state === 'expiring')
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
  const expired = rentedWithExpiry
    .filter(x => x.state === 'expired')
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
  const expiryAlerts = [...expired, ...expiring].slice(0, 5)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 p-8 pt-20 md:pt-24 overflow-auto">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton w-4 h-4 rounded" />
              </div>
              <div className="skeleton h-8 w-20 mb-1 rounded" />
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          )) : [
            { label: 'ทรัพย์ว่าง', val: available, icon: '🏠', color: '#0F6E56', bg: 'rgba(135,168,120,0.1)' },
            { label: 'จองแล้ว', val: reserved, icon: '📋', color: '#854F0B', bg: 'rgba(239,159,39,0.1)' },
            { label: 'ติดต่อใหม่', val: newInquiries, icon: '🔔', color: 'var(--terracotta)', bg: 'rgba(196,98,45,0.1)' },
            { label: 'รายได้ค่านายหน้าเดือนนี้', val: `฿${totalRevenue.toLocaleString()}`, icon: '💰', color: '#185FA5', bg: 'rgba(55,138,221,0.1)' },
            {
              label: overdueCount > 0 ? `ค้างชำระ ${overdueCount} รายการ` : 'ค้างชำระ',
              val: `฿${overdueTotal.toLocaleString()}`,
              icon: '⚠️',
              color: overdueTotal > 0 ? '#A32D2D' : 'var(--text-light)',
              bg: overdueTotal > 0 ? 'rgba(226,75,74,0.1)' : 'rgba(107,68,35,0.06)',
            },
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

        {/* Commission revenue chart */}
        {!loading && (
          <div className="rounded-2xl border p-6 mb-6" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: 'var(--terracotta)' }} />
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--brown)' }}>รายได้ค่านายหน้า</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--terracotta)' }}>
                  รวม ฿{seriesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-1.5">
                {([6, 12, 24] as RangeMonths[]).map(r => (
                  <button key={r} onClick={() => setRange(r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={{
                      background: range === r ? 'var(--terracotta)' : 'white',
                      borderColor: range === r ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                      color: range === r ? 'white' : 'var(--text-mid)',
                    }}>
                    {r} เดือน
                  </button>
                ))}
              </div>
            </div>
            {/* Bar chart */}
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end gap-1.5" style={{ minWidth: `${series.length * 36}px`, height: 200 }}>
                {series.map(b => {
                  const heightPct = (b.total / maxVal) * 100
                  const isCurrent = b.key === thisMonthKey
                  return (
                    <div key={b.key} className="flex-1 flex flex-col items-center gap-1.5 group min-w-[30px]">
                      <div className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                        style={{ color: 'var(--text-mid)' }}>
                        ฿{b.total.toLocaleString()}
                      </div>
                      <div className="w-full flex items-end" style={{ height: 160 }}>
                        <div className="w-full rounded-t-lg transition-all"
                          style={{
                            height: `${Math.max(heightPct, b.total > 0 ? 4 : 0)}%`,
                            background: isCurrent ? 'var(--terracotta)' : 'rgba(196,98,45,0.55)',
                            minHeight: b.total > 0 ? 4 : 0,
                          }}
                          title={`${b.label}: ฿${b.total.toLocaleString()}`} />
                      </div>
                      <div className="text-[10px] text-center whitespace-nowrap"
                        style={{ color: isCurrent ? 'var(--terracotta)' : 'var(--text-light)', fontWeight: isCurrent ? 600 : 400 }}>
                        {b.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {seriesTotal === 0 && (
              <div className="text-center py-4 text-sm" style={{ color: 'var(--text-light)' }}>
                ยังไม่มีรายได้ค่านายหน้าในช่วงนี้
              </div>
            )}
          </div>
        )}

        {/* Rental expiry alerts */}
        {!loading && (expired.length > 0 || expiring.length > 0) && (
          <div className="rounded-2xl border overflow-hidden mb-6" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: expired.length > 0 ? '#A32D2D' : '#854F0B' }} />
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--brown)' }}>สัญญาเช่าใกล้หมด</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--terracotta)' }}>
                  {expired.length + expiring.length}
                </span>
              </div>
              <Link href="/admin/properties" className="text-xs font-medium" style={{ color: 'var(--terracotta)' }}>
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
              {expiryAlerts.map(({ p, daysLeft, state }) => {
                const isExpired = state === 'expired'
                const endDate = p.active_rental?.end_date ? new Date(p.active_rental.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
                return (
                  <Link key={p.id} href={`/admin/properties/${p.id}/edit`}
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[rgba(196,98,45,0.03)]">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isExpired ? 'rgba(226,75,74,0.1)' : 'rgba(239,159,39,0.12)',
                          color: isExpired ? '#A32D2D' : '#854F0B',
                        }}>
                        <Clock size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                          {p.title_en || p.title}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-light)' }}>
                          {p.district}{p.owner?.name ? ` · ${p.owner.name}` : ''} · ถึง {endDate}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-3"
                      style={{
                        background: isExpired ? 'rgba(226,75,74,0.15)' : 'rgba(239,159,39,0.18)',
                        color: isExpired ? '#A32D2D' : '#854F0B',
                      }}>
                      {isExpired ? `หมดแล้ว ${Math.abs(daysLeft!)} วัน` : `เหลือ ${daysLeft} วัน`}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent inquiries */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
            <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--brown)' }}>การติดต่อล่าสุด</h2>
            <Link href="/admin/inquiries" className="text-xs font-medium" style={{ color: 'var(--terracotta)' }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-9 h-9 rounded-full" />
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-28 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-6 w-14 rounded-full" />
                </div>
              </div>
            )) : inquiries.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                ยังไม่มีการติดต่อ
              </div>
            ) : (
              inquiries.slice(0, 5).map(inq => {
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
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
