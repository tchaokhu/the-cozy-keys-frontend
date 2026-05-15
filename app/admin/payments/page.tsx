'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Wallet, ChevronRight, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { getPayments, getPaymentStatus } from '@/lib/supabase'
import type { Payment, PaymentStatus } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

type RentalGroup = {
  rental_id: string
  property_id: string
  property_title: string
  property_title_en?: string
  tenant_name: string
  start_date: string
  end_date: string
  rental_status: string
  total_count: number
  paid_count: number
  overdue_count: number
  partial_count: number
  pending_count: number
  outstanding_total: number
  paid_total: number
  next_due_date?: string
}

type GroupStatusFilter = '' | 'overdue' | 'outstanding' | 'clear'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>('')

  useEffect(() => {
    setLoading(true)
    getPayments().then(data => { setPayments(data); setLoading(false) })
  }, [])

  const groups = useMemo<RentalGroup[]>(() => {
    const map = new Map<string, RentalGroup>()
    for (const p of payments) {
      const key = p.rental_id
      const status = getPaymentStatus(p)
      const paid = p.paid_amount ?? 0
      let g = map.get(key)
      if (!g) {
        g = {
          rental_id: key,
          property_id: p.property_id,
          property_title: p.property?.title || '—',
          property_title_en: p.property?.title_en,
          tenant_name: p.rental?.tenant_name_snapshot || '—',
          start_date: p.rental?.start_date || '',
          end_date: p.rental?.end_date || '',
          rental_status: p.rental?.status || 'active',
          total_count: 0, paid_count: 0, overdue_count: 0, partial_count: 0, pending_count: 0,
          outstanding_total: 0, paid_total: 0,
        }
        map.set(key, g)
      }
      g.total_count++
      g.paid_total += paid
      if (status === 'paid') g.paid_count++
      else if (status === 'overdue') { g.overdue_count++; g.outstanding_total += p.amount - paid }
      else if (status === 'partial') { g.partial_count++; g.outstanding_total += p.amount - paid }
      else if (status === 'pending') {
        g.pending_count++
        if (!g.next_due_date || p.due_date < g.next_due_date) g.next_due_date = p.due_date
      }
    }
    // Sort: overdue first, then outstanding, then by next_due_date, then by property title
    return Array.from(map.values()).sort((a, b) => {
      if (a.overdue_count !== b.overdue_count) return b.overdue_count - a.overdue_count
      if (a.outstanding_total !== b.outstanding_total) return b.outstanding_total - a.outstanding_total
      if (a.next_due_date && b.next_due_date) return a.next_due_date.localeCompare(b.next_due_date)
      return a.property_title.localeCompare(b.property_title, 'th')
    })
  }, [payments])

  const filteredGroups = useMemo(() => {
    let list = groups
    if (statusFilter === 'overdue') list = list.filter(g => g.overdue_count > 0)
    else if (statusFilter === 'outstanding') list = list.filter(g => g.overdue_count + g.partial_count + g.pending_count > 0)
    else if (statusFilter === 'clear') list = list.filter(g => g.paid_count === g.total_count)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.property_title.toLowerCase().includes(q) ||
        (g.property_title_en?.toLowerCase().includes(q) ?? false) ||
        g.tenant_name.toLowerCase().includes(q)
      )
    }
    return list
  }, [groups, statusFilter, search])

  const summary = useMemo(() => {
    const enriched = payments.map(p => ({ p, s: getPaymentStatus(p) }))
    const overdueTotal = enriched
      .filter(x => x.s === 'overdue' || x.s === 'partial')
      .reduce((sum, x) => sum + (x.p.amount - (x.p.paid_amount ?? 0)), 0)
    const overdueCount = enriched.filter(x => x.s === 'overdue').length
    const partialCount = enriched.filter(x => x.s === 'partial').length
    const pendingCount = enriched.filter(x => x.s === 'pending').length
    const paidThisMonthTotal = enriched
      .filter(x => {
        if (!x.p.paid_date) return false
        const d = new Date(x.p.paid_date)
        const now = new Date()
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, x) => sum + (x.p.paid_amount ?? 0), 0)
    return { overdueTotal, overdueCount, partialCount, pendingCount, paidThisMonthTotal }
  }, [payments])

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pb-12 pt-20 md:pt-24 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>การชำระเงิน</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {loading ? '...' : `${groups.length} ห้อง · ${payments.length} รายการรวม`}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="skeleton h-6 w-24" />
            </div>
          )) : (
            <>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ค้างชำระรวม</div>
                <div className="font-serif text-xl font-bold" style={{ color: '#A32D2D' }}>
                  ฿{summary.overdueTotal.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ค้าง / บางส่วน</div>
                <div className="font-serif text-xl font-bold" style={{ color: '#854F0B' }}>
                  {summary.overdueCount + summary.partialCount} <span className="text-sm font-normal">รายการ</span>
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>รอจ่าย</div>
                <div className="font-serif text-xl font-bold" style={{ color: 'var(--text-mid)' }}>
                  {summary.pendingCount} <span className="text-sm font-normal">รายการ</span>
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>รับแล้วเดือนนี้</div>
                <div className="font-serif text-xl font-bold" style={{ color: '#0F6E56' }}>
                  ฿{summary.paidThisMonthTotal.toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
            <input type="text" placeholder="ค้นหา ทรัพย์ / ผู้เช่า..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
          </div>
        </div>

        {/* Group filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <span className="text-xs self-center pr-1" style={{ color: 'var(--text-light)' }}>สถานะ:</span>
          {([
            { v: '', label: 'ทั้งหมด' },
            { v: 'overdue', label: 'มีค้างชำระ' },
            { v: 'outstanding', label: 'ยังไม่ครบ' },
            { v: 'clear', label: 'จ่ายครบแล้ว' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: statusFilter === v ? 'var(--terracotta)' : 'white',
                borderColor: statusFilter === v ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                color: statusFilter === v ? 'white' : 'var(--text-mid)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Rental groups */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="skeleton h-5 w-2/3 mb-2" />
                <div className="skeleton h-3 w-1/3 mb-3" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Wallet size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              {payments.length === 0 ? 'ยังไม่มีรายการชำระเงิน' : 'ไม่พบรายการตามเงื่อนไข'}
            </p>
            {payments.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                สร้างสัญญาเช่าจะสร้างรายการอัตโนมัติ
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(g => {
              const hasOverdue = g.overdue_count > 0
              const hasPartial = g.partial_count > 0
              const allPaid = g.paid_count === g.total_count
              const ended = g.rental_status !== 'active'

              return (
                <Link key={g.rental_id} href={`/admin/payments/${g.rental_id}`}
                  className="block rounded-2xl border p-5 transition-all hover:shadow-md"
                  style={{ background: 'white', borderColor: hasOverdue ? 'rgba(226,75,74,0.25)' : 'rgba(196,98,45,0.08)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-serif text-base font-bold truncate" style={{ color: 'var(--brown)' }}>
                          {g.property_title_en || g.property_title}
                        </h3>
                        {ended && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: 'rgba(107,68,35,0.08)', color: 'var(--text-light)' }}>
                            ปิดสัญญาแล้ว
                          </span>
                        )}
                        {allPaid && !ended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: 'rgba(135,168,120,0.15)', color: '#0F6E56' }}>
                            <CheckCircle2 size={11} /> จ่ายครบ
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-light)' }}>
                        {g.tenant_name} · {g.start_date && formatDate(g.start_date)} – {g.end_date && formatDate(g.end_date)}
                      </p>

                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        {hasOverdue && (
                          <span className="inline-flex items-center gap-1" style={{ color: '#A32D2D' }}>
                            <AlertCircle size={13} />
                            <span className="font-medium">ค้างชำระ {g.overdue_count} รายการ</span>
                          </span>
                        )}
                        {hasPartial && (
                          <span className="inline-flex items-center gap-1" style={{ color: '#854F0B' }}>
                            <Clock size={13} />
                            <span className="font-medium">จ่ายบางส่วน {g.partial_count}</span>
                          </span>
                        )}
                        {!hasOverdue && !hasPartial && g.next_due_date && (
                          <span className="inline-flex items-center gap-1" style={{ color: 'var(--text-mid)' }}>
                            <Clock size={13} />
                            งวดถัดไป {formatDate(g.next_due_date)}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-light)' }}>
                          จ่ายแล้ว {g.paid_count}/{g.total_count} งวด
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {g.outstanding_total > 0 ? (
                        <>
                          <div className="text-[10px]" style={{ color: 'var(--text-light)' }}>ยอดค้าง</div>
                          <div className="font-serif text-lg font-bold" style={{ color: '#A32D2D' }}>
                            ฿{g.outstanding_total.toLocaleString()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px]" style={{ color: 'var(--text-light)' }}>รับแล้วรวม</div>
                          <div className="font-serif text-lg font-bold" style={{ color: '#0F6E56' }}>
                            ฿{g.paid_total.toLocaleString()}
                          </div>
                        </>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--text-light)' }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
