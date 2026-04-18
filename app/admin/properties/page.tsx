'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, Eye, Trash2 } from 'lucide-react'
import { getProperties, deleteProperty } from '@/lib/supabase'
import type { Property } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'

const STATUS_STYLE = {
  available: { label: 'ว่าง', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  reserved: { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  rented: { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
}
const TYPE_LABEL = { condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม' }
const STATUS_ORDER = { available: 0, reserved: 1, rented: 2 }

type SortKey = 'title' | 'property_type' | 'district' | 'owner' | 'price_monthly' | 'status'
type SortDir = 'asc' | 'desc'

export default function AdminProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [loading, setLoading] = useState(true)
  const perPage = 10

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

  useEffect(() => {
    getProperties().then(data => { setProperties(data); setLoading(false) })
  }, [])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteProperty(deleteId)
      setProperties(prev => prev.filter(p => p.id !== deleteId))
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  let filtered = properties
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.title_en?.toLowerCase().includes(q) ?? false) ||
      p.district.toLowerCase().includes(q)
    )
  }
  if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter)

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title, 'th'); break
        case 'property_type': cmp = (TYPE_LABEL[a.property_type] || '').localeCompare(TYPE_LABEL[b.property_type] || '', 'th'); break
        case 'district': cmp = (a.district || '').localeCompare(b.district || '', 'th'); break
        case 'owner': cmp = (a.owner?.name || '').localeCompare(b.owner?.name || '', 'th'); break
        case 'price_monthly': cmp = a.price_monthly - b.price_monthly; break
        case 'status': cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter])

  const columns: Column<Property>[] = [
    {
      key: 'title',
      label: 'ทรัพย์',
      sortable: true,
      headerAlign: 'center',
      skeleton: (
        <div className="space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
        </div>
      ),
      render: p => (
        <>
          <div className="font-medium text-sm" style={{ color: 'var(--text-dark)' }}>{p.title_en || p.title}</div>
          {p.title_en && (
            <div className="text-xs" style={{ color: 'var(--text-mid)' }}>{p.title}</div>
          )}
          <div className="text-xs" style={{ color: 'var(--text-light)' }}>
            {p.bedrooms} นอน · {p.bathrooms} น้ำ · {p.area_sqm} ตร.ม.{p.building ? ` · ${p.building}` : ''}{p.floor ? ` · ชั้น ${p.floor}` : ''}{p.room_number ? ` · ห้อง ${p.room_number}` : ''}
          </div>
        </>
      ),
    },
    {
      key: 'property_type',
      label: 'ประเภท',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-16 mx-auto" />,
      render: p => (
        <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{TYPE_LABEL[p.property_type]}</span>
      ),
    },
    {
      key: 'district',
      label: 'ทำเล',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 mx-auto" />,
      render: p => (
        <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{p.district}</span>
      ),
    },
    {
      key: 'owner',
      label: 'เจ้าของ',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-24 mx-auto" />,
      render: p => p.owner ? (
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{p.owner.name}</div>
          {p.owner.source && (
            <div className="text-xs" style={{ color: 'var(--text-light)' }}>{p.owner.source}</div>
          )}
        </div>
      ) : (
        <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>
      ),
    },
    {
      key: 'price_monthly',
      label: 'ราคา/เดือน',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 mx-auto" />,
      render: p => (
        <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
          ฿{p.price_monthly.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-6 w-16 rounded-full mx-auto" />,
      render: p => {
        const s = STATUS_STYLE[p.status]
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
            style={{ background: s.bg, color: s.color }}>{s.label}</span>
        )
      },
    },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pb-12 pt-20 md:pt-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ทรัพย์ทั้งหมด</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>{properties.length} รายการ</p>
          </div>
          <Link href="/admin/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มทรัพย์ใหม่
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
            <input type="text" placeholder="ค้นหาทรัพย์..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
          </div>
          {['', 'available', 'reserved', 'rented'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: statusFilter === s ? 'var(--terracotta)' : 'white',
                borderColor: statusFilter === s ? 'var(--terracotta)' : 'rgba(196,98,45,0.15)',
                color: statusFilter === s ? 'white' : 'var(--text-mid)',
              }}>
              {s === '' ? 'ทั้งหมด' : STATUS_STYLE[s as keyof typeof STATUS_STYLE].label}
            </button>
          ))}
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full ml-2" />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-3 w-32" />
              </div>
              <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}>
                <div className="skeleton h-8 flex-1 rounded-xl" />
                <div className="skeleton h-8 flex-1 rounded-xl" />
                <div className="skeleton h-8 flex-1 rounded-xl" />
              </div>
            </div>
          )) : paginated.map((p: Property) => {
            const s = STATUS_STYLE[p.status]
            return (
              <div key={p.id} className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-dark)' }}>{p.title_en || p.title}</div>
                    {p.title_en && (
                      <div className="text-xs truncate" style={{ color: 'var(--text-mid)' }}>{p.title}</div>
                    )}
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>
                      {TYPE_LABEL[p.property_type]} · {p.district}{p.building ? ` · ${p.building}` : ''}{p.floor ? ` · ชั้น ${p.floor}` : ''}{p.room_number ? ` · ห้อง ${p.room_number}` : ''}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium ml-2 shrink-0"
                    style={{ background: s.bg, color: s.color }}>{s.label}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
                      ฿{p.price_monthly.toLocaleString()}
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-light)' }}>/เดือน</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                    {p.bedrooms} นอน · {p.bathrooms} น้ำ · {p.area_sqm} ตร.ม.{p.building ? ` · ${p.building}` : ''}{p.floor ? ` · ชั้น ${p.floor}` : ''}{p.room_number ? ` · ห้อง ${p.room_number}` : ''}
                  </div>
                </div>
                {p.owner && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-light)' }}>เจ้าของ</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
                      {p.owner.name}
                      {p.owner.source && <span className="font-normal text-xs ml-1" style={{ color: 'var(--text-light)' }}>({p.owner.source})</span>}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}>
                  <Link href={`/listings/${p.id}`} className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>ดู</Link>
                  <Link href={`/admin/properties/${p.id}/edit`} className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>แก้ไข</Link>
                  <button onClick={() => setDeleteId(p.id)} className="flex-1 text-center py-2 rounded-xl text-xs font-medium border"
                    style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>ลบ</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop Table */}
        <AdminTable<Property>
          className="hidden md:block"
          columns={columns}
          data={paginated}
          rowKey={p => p.id}
          loading={loading}
          skeletonRows={6}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={k => toggleSort(k as SortKey)}
          renderActions={p => (
            <>
              <Link
                href={`/listings/${p.id}`}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
              >
                <Eye size={15} />
              </Link>
              <Link
                href={`/admin/properties/${p.id}/edit`}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
              >
                <Edit2 size={15} />
              </Link>
              <button
                onClick={() => setDeleteId(p.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
              >
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
      </main>

      {/* Delete confirm dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>
              ยืนยันการลบ
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              ทรัพย์นี้จะถูกลบถาวร ไม่สามารถกู้คืนได้
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
                {deleting ? 'กำลังลบ...' : 'ลบทรัพย์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
