'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, Eye, Trash2 } from 'lucide-react'
import { getProperties, deleteProperty } from '@/lib/supabase'
import type { Property } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

const STATUS_STYLE = {
  available: { label: 'ว่าง', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  reserved: { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  rented: { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
}
const TYPE_LABEL = { condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม' }

export default function AdminProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getProperties().then(setProperties)
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
  if (search) filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.district.includes(search))
  if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
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

        {/* Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(196,98,45,0.08)', background: 'var(--cream)' }}>
                {['ทรัพย์', 'ประเภท', 'ทำเล', 'เจ้าของ', 'ราคา/เดือน', 'สถานะ', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--text-light)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: Property) => {
                const s = STATUS_STYLE[p.status]
                return (
                  <tr key={p.id} className="border-b transition-colors"
                    style={{ borderColor: 'rgba(196,98,45,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,240,232,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm" style={{ color: 'var(--text-dark)' }}>{p.title}</div>
                      <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                        {p.bedrooms} นอน · {p.bathrooms} น้ำ · {p.area_sqm} ตร.ม.
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-mid)' }}>{TYPE_LABEL[p.property_type]}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-mid)' }}>{p.district}</td>
                    <td className="px-5 py-4">
                      {p.owner ? (
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{p.owner.name}</div>
                          {p.owner.source && (
                            <div className="text-xs" style={{ color: 'var(--text-light)' }}>{p.owner.source}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-serif font-semibold text-sm" style={{ color: 'var(--terracotta)' }}>
                        ฿{p.price_monthly.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link href={`/listings/${p.id}`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                          <Eye size={15} />
                        </Link>
                        <Link href={`/admin/properties/${p.id}/edit`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                          <Edit2 size={15} />
                        </Link>
                        <button onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
