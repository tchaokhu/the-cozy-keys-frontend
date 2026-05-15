'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, Eye, Trash2, ImageOff, X } from 'lucide-react'
import { getProperties, deleteProperty, getRentalStatus } from '@/lib/supabase'
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

function RentalBadge({ rented_until, status }: { rented_until?: string; status: string }) {
  if (status !== 'rented') return null
  const { daysLeft, state } = getRentalStatus(rented_until)
  if (!state || state === 'active') return null
  const style = state === 'expired'
    ? { bg: 'rgba(226,75,74,0.15)', color: '#A32D2D', label: `หมดสัญญา ${Math.abs(daysLeft!)} วัน` }
    : { bg: 'rgba(239,159,39,0.18)', color: '#854F0B', label: `เหลือ ${daysLeft} วัน` }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  )
}

type SortKey = 'title' | 'property_type' | 'district' | 'owner' | 'price_monthly' | 'status'
type SortDir = 'asc' | 'desc'

export default function AdminProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
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
      key: 'cover',
      label: 'ภาพ',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-14 w-14 rounded-lg mx-auto" />,
      render: p => {
        const cover = p.images?.[0]
        if (!cover) {
          return (
            <div className="h-14 w-14 rounded-lg flex items-center justify-center mx-auto"
              style={{ background: 'rgba(196,98,45,0.08)', color: 'var(--text-light)' }}>
              <ImageOff size={18} />
            </div>
          )
        }
        return (
          <button
            onClick={() => setPreviewImage(cover)}
            className="block h-14 w-14 rounded-lg overflow-hidden mx-auto cursor-zoom-in transition-transform hover:scale-105"
            style={{ background: 'rgba(196,98,45,0.05)' }}
            title="คลิกเพื่อดูภาพขนาดเต็ม"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={p.title} className="h-full w-full object-cover" />
          </button>
        )
      },
    },
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
          <div className="flex flex-col items-center gap-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ background: s.bg, color: s.color }}>{s.label}</span>
            <RentalBadge rented_until={p.active_rental?.end_date} status={p.status} />
          </div>
        )
      },
    },
    {
      key: 'postings',
      label: 'โพสต์แล้ว',
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-20 rounded mx-auto" />,
      render: p => {
        const posted = p.postings ?? []
        if (posted.length === 0) return <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>
        const shown = posted.slice(0, 2)
        const extra = posted.length - 2
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {shown.map(pp => (
              <span
                key={pp.platform_id}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}
              >
                {pp.platform_name}
              </span>
            ))}
            {extra > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: 'rgba(196,98,45,0.06)', color: 'var(--text-mid)' }}
              >
                +{extra}
              </span>
            )}
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
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ทรัพย์ทั้งหมด</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>{properties.length} รายการ</p>
          </div>
          <Link href="/admin/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มทรัพย์ใหม่
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input type="text" placeholder="ค้นหาทรัพย์..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
        </div>

        {/* Status Filter */}
        <div className="flex gap-3 mb-6 flex-wrap">
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

        {!loading && properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="text-4xl">🏠</div>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีข้อมูลทรัพย์</p>
            <Link href="/admin/properties/new"
              className="text-sm font-medium" style={{ color: 'var(--terracotta)' }}>
              เพิ่มทรัพย์แรก
            </Link>
          </div>
        ) : (
          <AdminTable<Property>
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
        )}
      </main>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="ภาพทรัพย์"
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

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
