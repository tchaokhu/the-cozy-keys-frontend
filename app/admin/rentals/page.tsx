'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Trash2, FileText, Edit2, Ban, ExternalLink } from 'lucide-react'
import { getRentals, deleteRental, getRentalStatus } from '@/lib/supabase'
import type { Rental } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'
import RentalModal, { RentalModalMode } from '@/components/admin/RentalModal'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'กำลังเช่า', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  ended: { label: 'หมดสัญญา', color: 'var(--text-light)', bg: 'rgba(107,68,35,0.08)' },
  cancelled: { label: 'ยกเลิก', color: '#A32D2D', bg: 'rgba(226,75,74,0.12)' },
}

type SortKey = 'tenant' | 'property' | 'start_date' | 'end_date' | 'monthly_rent' | 'status'
type SortDir = 'asc' | 'desc'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

function RentalExpiryBadge({ end_date, status }: { end_date: string; status: string }) {
  if (status !== 'active') return null
  const { daysLeft, state } = getRentalStatus(end_date)
  if (!state || state === 'active') return null
  const style = state === 'expired'
    ? { bg: 'rgba(226,75,74,0.15)', color: '#A32D2D', label: `หมดแล้ว ${Math.abs(daysLeft!)} วัน` }
    : { bg: 'rgba(239,159,39,0.18)', color: '#854F0B', label: `เหลือ ${daysLeft} วัน` }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  )
}

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'ended' | 'cancelled'>('active')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>('end_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const perPage = 10

  const [modalMode, setModalMode] = useState<RentalModalMode | null>(null)
  const [modalRental, setModalRental] = useState<Rental | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = () => {
    setLoading(true)
    getRentals().then(data => { setRentals(data); setLoading(false) })
  }

  useEffect(() => { reload() }, [])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteRental(deleteId)
      setRentals(prev => prev.filter(r => r.id !== deleteId))
    } catch {
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  let filtered = rentals
  if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.tenant_name_snapshot.toLowerCase().includes(q) ||
      (r.property?.title.toLowerCase().includes(q) ?? false) ||
      (r.property?.title_en?.toLowerCase().includes(q) ?? false) ||
      (r.tenant_phone_snapshot?.toLowerCase().includes(q) ?? false)
    )
  }

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'tenant': cmp = a.tenant_name_snapshot.localeCompare(b.tenant_name_snapshot, 'th'); break
        case 'property': cmp = (a.property?.title || '').localeCompare(b.property?.title || '', 'th'); break
        case 'start_date': cmp = a.start_date.localeCompare(b.start_date); break
        case 'end_date': cmp = a.end_date.localeCompare(b.end_date); break
        case 'monthly_rent': cmp = a.monthly_rent - b.monthly_rent; break
        case 'status': cmp = a.status.localeCompare(b.status); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const openEdit = (r: Rental) => { setModalRental(r); setModalMode('edit') }
  const openEnd = (r: Rental) => { setModalRental(r); setModalMode('end') }
  const closeModal = () => { setModalRental(null); setModalMode(null) }

  const columns: Column<Rental>[] = [
    {
      key: 'property',
      label: 'ทรัพย์',
      sortable: true,
      headerAlign: 'center',
      skeleton: (
        <div className="space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
        </div>
      ),
      render: r => r.property ? (
        <div>
          <div className="font-medium text-sm" style={{ color: 'var(--text-dark)' }}>
            {r.property.title_en || r.property.title}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-light)' }}>
            {r.property.district}{r.property.room_number ? ` · ห้อง ${r.property.room_number}` : ''}
          </div>
        </div>
      ) : <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>,
    },
    {
      key: 'tenant',
      label: 'ผู้เช่า',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-28 rounded" />,
      render: r => (
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
            {r.tenant?.name || r.tenant_name_snapshot}
          </div>
          {(r.tenant?.phone || r.tenant_phone_snapshot) && (
            <div className="text-xs" style={{ color: 'var(--text-light)' }}>
              {r.tenant?.phone || r.tenant_phone_snapshot}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'start_date',
      label: 'ช่วงสัญญา',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-32 mx-auto rounded" />,
      render: r => (
        <div className="text-xs" style={{ color: 'var(--text-mid)' }}>
          {formatDate(r.start_date)} → {formatDate(r.end_date)}
        </div>
      ),
    },
    {
      key: 'monthly_rent',
      label: 'ค่าเช่า/เดือน',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 mx-auto rounded" />,
      render: r => (
        <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
          ฿{r.monthly_rent.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-6 w-20 rounded-full mx-auto" />,
      render: r => {
        const s = STATUS_STYLE[r.status]
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ background: s.bg, color: s.color }}>{s.label}</span>
            <RentalExpiryBadge end_date={r.end_date} status={r.status} />
          </div>
        )
      },
    },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pb-12 pt-20 md:pt-24 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>สัญญาเช่า</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {loading ? '...' : `${rentals.length} รายการ`}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
            <input type="text" placeholder="ค้นหา ทรัพย์ / ผู้เช่า / เบอร์..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
          </div>
          {([
            { v: 'active', label: 'กำลังเช่า' },
            { v: 'ended', label: 'หมดสัญญา' },
            { v: 'cancelled', label: 'ยกเลิก' },
            { v: '', label: 'ทั้งหมด' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: statusFilter === v ? 'var(--terracotta)' : 'white',
                borderColor: statusFilter === v ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                color: statusFilter === v ? 'white' : 'var(--text-mid)',
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
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-8 w-full rounded-xl mt-3" />
            </div>
          )) : paginated.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>ไม่พบสัญญาเช่า</p>
            </div>
          ) : paginated.map(r => {
            const s = STATUS_STYLE[r.status]
            return (
              <div key={r.id} className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-dark)' }}>
                      {r.property?.title_en || r.property?.title || '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                      ผู้เช่า: {r.tenant?.name || r.tenant_name_snapshot}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <RentalExpiryBadge end_date={r.end_date} status={r.status} />
                  </div>
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-mid)' }}>
                  {formatDate(r.start_date)} → {formatDate(r.end_date)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
                    ฿{r.monthly_rent.toLocaleString()}/เดือน
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}>
                  {r.property && (
                    <Link href={`/admin/properties/${r.property_id}/edit`}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                      style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>ดูทรัพย์</Link>
                  )}
                  <button onClick={() => openEdit(r)}
                    className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>แก้ไข</button>
                  {r.status === 'active' && (
                    <button onClick={() => openEnd(r)}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                      style={{ borderColor: 'rgba(239,159,39,0.3)', color: '#854F0B' }}>ปิด</button>
                  )}
                  <button onClick={() => setDeleteId(r.id)}
                    className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>ลบ</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <AdminTable<Rental>
          className="hidden md:block"
          columns={columns}
          data={paginated}
          rowKey={r => r.id}
          loading={loading}
          skeletonRows={6}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={k => toggleSort(k as SortKey)}
          renderActions={r => (
            <>
              {r.property && (
                <Link href={`/admin/properties/${r.property_id}/edit`}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                  title="ไปที่ทรัพย์">
                  <ExternalLink size={15} />
                </Link>
              )}
              <button onClick={() => openEdit(r)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                title="แก้ไข">
                <Edit2 size={15} />
              </button>
              {r.status === 'active' && (
                <button onClick={() => openEnd(r)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#854F0B')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                  title="ปิดสัญญา">
                  <Ban size={15} />
                </button>
              )}
              <button onClick={() => setDeleteId(r.id)}
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
          page={safePage}
          perPage={perPage}
          total={filtered.length}
          onPageChange={setCurrentPage}
          headerVariant="terracotta"
          minWidth={700}
        />

        {!loading && rentals.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <FileText size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีสัญญาเช่า</p>
            <p className="text-xs" style={{ color: 'var(--text-light)' }}>
              สร้างสัญญาใหม่ได้ที่หน้าแก้ไขทรัพย์
            </p>
          </div>
        )}
      </main>

      {modalMode && modalRental?.property && (
        <RentalModal
          mode={modalMode}
          property={modalRental.property}
          rental={modalRental}
          onClose={closeModal}
          onSaved={() => { closeModal(); reload() }}
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
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              สัญญาเช่านี้จะถูกลบถาวร (ใช้ &quot;ปิดสัญญา&quot; แทนถ้าต้องการเก็บประวัติ)
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: '#dc2626', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'กำลังลบ...' : 'ลบสัญญา'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
