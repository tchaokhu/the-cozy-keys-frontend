'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Edit2, Trash2, ExternalLink, Wallet } from 'lucide-react'
import { getPaymentsByRental, getRentalById, deletePayment, getPaymentStatus } from '@/lib/supabase'
import type { Payment, Rental, PaymentStatus, PaymentType } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'
import PaymentMarkPaidModal from '@/components/admin/PaymentMarkPaidModal'

const STATUS_STYLE: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'จ่ายแล้ว', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  partial: { label: 'จ่ายบางส่วน', color: '#854F0B', bg: 'rgba(239,159,39,0.18)' },
  overdue: { label: 'ค้างชำระ', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
  pending: { label: 'รอจ่าย', color: 'var(--text-light)', bg: 'rgba(107,68,35,0.08)' },
}

const TYPE_STYLE: Record<PaymentType, { label: string; color: string; bg: string }> = {
  rent: { label: 'ค่าเช่า', color: 'var(--terracotta)', bg: 'rgba(196,98,45,0.1)' },
  deposit: { label: 'เงินประกัน', color: '#185FA5', bg: 'rgba(55,138,221,0.1)' },
  commission: { label: 'ค่านายหน้า', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  other: { label: 'อื่นๆ', color: 'var(--text-light)', bg: 'rgba(107,68,35,0.08)' },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

export default function PaymentDetailPage() {
  const params = useParams<{ rentalId: string }>()
  const router = useRouter()
  const rentalId = params.rentalId

  const [rental, setRental] = useState<Rental | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'' | PaymentStatus>('')
  const [typeFilter, setTypeFilter] = useState<'' | PaymentType>('')

  const [payModal, setPayModal] = useState<Payment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = async () => {
    setLoading(true)
    const [r, ps] = await Promise.all([getRentalById(rentalId), getPaymentsByRental(rentalId)])
    if (!r) { setNotFound(true); setLoading(false); return }
    setRental(r)
    setPayments(ps)
    setLoading(false)
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rentalId])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deletePayment(deleteId)
      setPayments(prev => prev.filter(p => p.id !== deleteId))
    } catch { alert('ลบไม่สำเร็จ') }
    finally { setDeleting(false); setDeleteId(null) }
  }

  const enriched = useMemo(() => payments.map(p => ({ ...p, _status: getPaymentStatus(p) })), [payments])

  let filtered = enriched
  if (statusFilter) filtered = filtered.filter(p => p._status === statusFilter)
  if (typeFilter) filtered = filtered.filter(p => p.type === typeFilter)

  const summary = useMemo(() => {
    const outstanding = enriched
      .filter(p => p._status === 'overdue' || p._status === 'partial')
      .reduce((s, p) => s + (p.amount - (p.paid_amount ?? 0)), 0)
    const paidTotal = enriched.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
    const contractTotal = enriched.reduce((s, p) => s + p.amount, 0)
    const overdueCount = enriched.filter(p => p._status === 'overdue').length
    const paidCount = enriched.filter(p => p._status === 'paid').length
    return { outstanding, paidTotal, contractTotal, overdueCount, paidCount }
  }, [enriched])

  type Row = Payment & { _status: PaymentStatus }

  const columns: Column<Row>[] = [
    {
      key: 'due_date', label: 'วันครบกำหนด', headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-24 mx-auto rounded" />,
      render: p => <div className="text-sm" style={{ color: 'var(--text-dark)' }}>{formatDate(p.due_date)}</div>,
    },
    {
      key: 'type', label: 'ประเภท', headerAlign: 'center',
      skeleton: <div className="skeleton h-6 w-16 mx-auto rounded-full" />,
      render: p => {
        const s = TYPE_STYLE[p.type]
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{ background: s.bg, color: s.color }}>{s.label}</span>
      },
    },
    {
      key: 'amount', label: 'จำนวน', headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 mx-auto rounded" />,
      render: p => {
        const paid = p.paid_amount ?? 0
        return (
          <div className="flex flex-col items-center">
            <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
              ฿{p.amount.toLocaleString()}
            </span>
            {p._status === 'partial' && (
              <span className="text-xs" style={{ color: '#854F0B' }}>
                จ่ายแล้ว ฿{paid.toLocaleString()}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'paid_date', label: 'วันที่จ่าย', headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 mx-auto rounded" />,
      render: p => p.paid_date
        ? <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{formatDate(p.paid_date)}</span>
        : <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>,
    },
    {
      key: 'status', label: 'สถานะ', headerAlign: 'center',
      skeleton: <div className="skeleton h-6 w-20 mx-auto rounded-full" />,
      render: p => {
        const s = STATUS_STYLE[p._status]
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{ background: s.bg, color: s.color }}>{s.label}</span>
      },
    },
  ]

  if (notFound) {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
        <AdminSidebar />
        <main className="flex-1 p-8 flex flex-col items-center justify-center gap-3">
          <Wallet size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่พบสัญญานี้</p>
          <button onClick={() => router.push('/admin/payments')}
            className="px-4 py-2 rounded-xl text-sm border"
            style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
            กลับไปยังรายการ
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pb-12 pt-20 md:pt-24 overflow-auto">
        {/* Back link */}
        <Link href="/admin/payments"
          className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
          style={{ color: 'var(--text-light)' }}>
          <ArrowLeft size={15} /> กลับไปรายการห้อง
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>
              {loading ? '...' : (rental?.property?.title_en || rental?.property?.title || '—')}
            </h1>
            {rental?.status && rental.status !== 'active' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: 'rgba(107,68,35,0.08)', color: 'var(--text-light)' }}>
                ปิดสัญญาแล้ว
              </span>
            )}
            {rental?.property_id && (
              <Link href={`/admin/properties/${rental.property_id}/edit`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>
                <ExternalLink size={12} /> ไปที่ทรัพย์
              </Link>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            {loading ? '...' : (
              <>
                {rental?.tenant_name_snapshot} · {rental?.start_date && formatDate(rental.start_date)} – {rental?.end_date && formatDate(rental.end_date)} · ค่าเช่า ฿{rental?.monthly_rent.toLocaleString()}/เดือน
              </>
            )}
          </p>
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
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>ยอดค้าง</div>
                <div className="font-serif text-xl font-bold" style={{ color: summary.outstanding > 0 ? '#A32D2D' : 'var(--text-mid)' }}>
                  ฿{summary.outstanding.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>รับแล้วรวม</div>
                <div className="font-serif text-xl font-bold" style={{ color: '#0F6E56' }}>
                  ฿{summary.paidTotal.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>มูลค่าสัญญา</div>
                <div className="font-serif text-xl font-bold" style={{ color: 'var(--text-mid)' }}>
                  ฿{summary.contractTotal.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-light)' }}>จ่ายแล้ว</div>
                <div className="font-serif text-xl font-bold" style={{ color: 'var(--text-mid)' }}>
                  {summary.paidCount}/{enriched.length} <span className="text-sm font-normal">งวด</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="text-xs self-center pr-1" style={{ color: 'var(--text-light)' }}>สถานะ:</span>
          {([
            { v: '', label: 'ทั้งหมด' },
            { v: 'overdue', label: 'ค้างชำระ' },
            { v: 'partial', label: 'จ่ายบางส่วน' },
            { v: 'pending', label: 'รอจ่าย' },
            { v: 'paid', label: 'จ่ายแล้ว' },
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

        {/* Type filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <span className="text-xs self-center pr-1" style={{ color: 'var(--text-light)' }}>ประเภท:</span>
          {([
            { v: '', label: 'ทั้งหมด' },
            { v: 'rent', label: 'ค่าเช่า' },
            { v: 'deposit', label: 'เงินประกัน' },
            { v: 'commission', label: 'ค่านายหน้า' },
            { v: 'other', label: 'อื่นๆ' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: typeFilter === v ? 'var(--brown)' : 'white',
                borderColor: typeFilter === v ? 'var(--brown)' : 'rgba(196,98,45,0.15)',
                color: typeFilter === v ? 'white' : 'var(--text-mid)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="skeleton h-4 w-3/4 mb-2" />
              <div className="skeleton h-3 w-1/2 mb-3" />
              <div className="skeleton h-8 w-full rounded-xl" />
            </div>
          )) : filtered.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่พบรายการ</p>
            </div>
          ) : filtered.map(p => {
            const s = STATUS_STYLE[p._status]
            const ts = TYPE_STYLE[p.type]
            return (
              <div key={p.id} className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-light)' }}>กำหนด</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{formatDate(p.due_date)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                      style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    {p.paid_date && (
                      <>
                        <div className="text-xs" style={{ color: 'var(--text-light)' }}>จ่ายเมื่อ</div>
                        <div className="text-sm" style={{ color: 'var(--text-mid)' }}>{formatDate(p.paid_date)}</div>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-serif font-semibold text-base" style={{ color: 'var(--terracotta)' }}>
                      ฿{p.amount.toLocaleString()}
                    </span>
                    {p._status === 'partial' && (
                      <div className="text-xs" style={{ color: '#854F0B' }}>
                        จ่ายแล้ว ฿{(p.paid_amount ?? 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}>
                  <button onClick={() => setPayModal(p)}
                    className="flex-1 text-center py-2 rounded-xl text-xs font-medium border inline-flex items-center justify-center gap-1"
                    style={{ borderColor: 'rgba(196,98,45,0.3)', color: 'var(--terracotta)' }}>
                    <CheckCircle size={13} /> {p._status === 'paid' ? 'แก้ไข' : 'บันทึกจ่าย'}
                  </button>
                  <button onClick={() => setDeleteId(p.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <AdminTable<Row>
          className="hidden md:block"
          columns={columns}
          data={filtered}
          rowKey={p => p.id}
          loading={loading}
          skeletonRows={6}
          renderActions={p => (
            <>
              <button onClick={() => setPayModal(p)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: p._status === 'paid' ? 'var(--text-light)' : 'var(--terracotta)' }}
                title={p._status === 'paid' ? 'แก้ไขการชำระ' : 'บันทึกการชำระ'}>
                <CheckCircle size={15} />
              </button>
              <button onClick={() => setPayModal(p)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                title="แก้ไข">
                <Edit2 size={15} />
              </button>
              <button onClick={() => setDeleteId(p.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                title="ลบ">
                <Trash2 size={15} />
              </button>
            </>
          )}
          actionsSkeleton={
            <div className="flex gap-2 justify-center">
              <div className="skeleton h-7 w-7 rounded-lg" />
              <div className="skeleton h-7 w-7 rounded-lg" />
              <div className="skeleton h-7 w-7 rounded-lg" />
            </div>
          }
          headerVariant="terracotta"
          minWidth={700}
        />

        {!loading && enriched.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-4">
            <Wallet size={36} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>สัญญานี้ยังไม่มีรายการชำระ</p>
          </div>
        )}
      </main>

      {payModal && (
        <PaymentMarkPaidModal
          payment={payModal}
          onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); reload() }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>ยืนยันการลบ</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>รายการชำระเงินนี้จะถูกลบถาวร</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: '#dc2626', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
