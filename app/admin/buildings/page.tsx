'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Building2, MapPin } from 'lucide-react'
import { getBuildings, createBuilding, updateBuilding, deleteBuilding } from '@/lib/supabase'
import type { Building } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'

type SortKey = 'name' | 'district' | 'facilities' | 'nearby'
type SortDir = 'asc' | 'desc'

const DISTRICT_OPTIONS = ['ศรีราชา', 'แหลมฉบัง', 'บ้านบึง']
const PROVINCE_OPTIONS = ['ชลบุรี']

const BLANK: Omit<Building, 'id' | 'created_at'> = {
  name: '',
  name_en: '',
  district: '',
  province: '',
  google_map_url: '',
  facilities: [],
  nearby: [],
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Building | null>(null)
  const [form, setForm] = useState(BLANK)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Facility / nearby input
  const [facilityInput, setFacilityInput] = useState('')
  const [nearbyInput, setNearbyInput] = useState('')

  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
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
    getBuildings().then(data => { setBuildings(data); setLoading(false) })
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search])

  const openNew = () => {
    setEditing(null)
    setForm(BLANK)
    setFacilityInput('')
    setNearbyInput('')
    setShowForm(true)
  }

  const openEdit = (b: Building) => {
    setEditing(b)
    setForm({
      name: b.name,
      name_en: b.name_en || '',
      district: b.district || '',
      province: b.province || '',
      google_map_url: b.google_map_url || '',
      facilities: [...b.facilities],
      nearby: [...b.nearby],
    })
    setFacilityInput('')
    setNearbyInput('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateBuilding(editing.id, form)
        setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b))
      } else {
        const created = await createBuilding(form)
        setBuildings(prev => [...prev, created])
      }
      setShowForm(false)
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteBuilding(deleteId)
      setBuildings(prev => prev.filter(b => b.id !== deleteId))
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const addFacility = () => {
    const val = facilityInput.trim()
    if (!val || form.facilities.includes(val)) return
    setForm(prev => ({ ...prev, facilities: [...prev.facilities, val] }))
    setFacilityInput('')
  }

  const removeFacility = (idx: number) => {
    setForm(prev => ({ ...prev, facilities: prev.facilities.filter((_, i) => i !== idx) }))
  }

  const addNearby = () => {
    const val = nearbyInput.trim()
    if (!val || form.nearby.includes(val)) return
    setForm(prev => ({ ...prev, nearby: [...prev.nearby, val] }))
    setNearbyInput('')
  }

  const removeNearby = (idx: number) => {
    setForm(prev => ({ ...prev, nearby: prev.nearby.filter((_, i) => i !== idx) }))
  }

  let filtered = search
    ? buildings.filter(b => {
        const q = search.toLowerCase()
        return (
          b.name.toLowerCase().includes(q) ||
          (b.name_en?.toLowerCase().includes(q) ?? false) ||
          (b.district?.toLowerCase().includes(q) ?? false)
        )
      })
    : buildings

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name, 'th'); break
        case 'district': cmp = (a.district || '').localeCompare(b.district || '', 'th'); break
        case 'facilities': cmp = a.facilities.length - b.facilities.length; break
        case 'nearby': cmp = a.nearby.length - b.nearby.length; break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const columns: Column<Building>[] = [
    {
      key: 'name',
      label: 'ชื่อโครงการ',
      sortable: true,
      headerAlign: 'center',
      skeleton: (
        <div className="space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
        </div>
      ),
      render: b => (
        <>
          <div className="font-medium text-sm" style={{ color: 'var(--text-dark)' }}>{b.name_en || b.name}</div>
          {b.name_en && (
            <div className="text-xs" style={{ color: 'var(--text-mid)' }}>{b.name}</div>
          )}
        </>
      ),
    },
    {
      key: 'district',
      label: 'ทำเล',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-24 mx-auto" />,
      render: b => {
        const loc = [b.district, b.province].filter(Boolean).join(', ')
        return loc
          ? <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{loc}</span>
          : <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>
      },
    },
    {
      key: 'map',
      label: 'แผนที่',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-6 w-20 rounded-full mx-auto" />,
      render: b => b.google_map_url
        ? (
          <a href={b.google_map_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80"
            style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
            <MapPin size={11} /> เปิดแผนที่
          </a>
        )
        : <span className="text-xs" style={{ color: 'var(--text-light)' }}>—</span>,
    },
    {
      key: 'facilities',
      label: 'Facilities',
      sortable: true,
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-4 w-8 mx-auto" />,
      render: b => (
        <span className="text-sm font-medium" style={{ color: b.facilities.length > 0 ? 'var(--text-dark)' : 'var(--text-light)' }}>
          {b.facilities.length}
        </span>
      ),
    },
    {
      key: 'nearby',
      label: 'Nearby',
      sortable: true,
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-4 w-8 mx-auto" />,
      render: b => (
        <span className="text-sm font-medium" style={{ color: b.nearby.length > 0 ? 'var(--text-dark)' : 'var(--text-light)' }}>
          {b.nearby.length}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ตึก / โครงการ</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>{buildings.length} โครงการ</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มโครงการ
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input type="text" placeholder="ค้นหาชื่อตึก / ทำเล..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-light)' }} />
            <p style={{ color: 'var(--text-light)' }}>ยังไม่มีข้อมูลตึก/โครงการ</p>
          </div>
        ) : (
          <AdminTable<Building>
            columns={columns}
            data={paginated}
            rowKey={b => b.id}
            loading={loading}
            skeletonRows={6}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={k => toggleSort(k as SortKey)}
            renderActions={b => (
              <>
                <button onClick={() => openEdit(b)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setDeleteId(b.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
            actionsSkeleton={
              <div className="flex gap-2 justify-center">
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl p-6 shadow-xl"
            style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>
                {editing ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-light)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>ชื่อโครงการ (TH) *</label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ลุมพินี วิลล์ ศรีราชา"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>ชื่อโครงการ (EN)</label>
                <input type="text" value={form.name_en || ''} onChange={e => setForm(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder="e.g. Lumpini Ville Sriracha"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
              </div>

              {/* Google Maps */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-mid)' }}>
                  <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> ที่ตั้ง (Google Maps URL)</span>
                </label>
                <input type="url" value={form.google_map_url || ''} onChange={e => setForm(prev => ({ ...prev, google_map_url: e.target.value }))}
                  placeholder="วาง link Google Maps ที่นี่..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-light)' }}>
                  เปิด Google Maps → ค้นหาโครงการ → กด &quot;แชร์&quot; → คัดลอก link มาวาง
                </p>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>อำเภอ</label>
                  <select value={form.district} onChange={e => setForm(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}>
                    <option value="">— เลือกอำเภอ —</option>
                    {DISTRICT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>จังหวัด</label>
                  <select value={form.province} onChange={e => setForm(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}>
                    <option value="">— เลือกจังหวัด —</option>
                    {PROVINCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>Facilities</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={facilityInput}
                    onChange={e => setFacilityInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFacility() } }}
                    placeholder="เช่น สระว่ายน้ำ, ฟิตเนส..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
                  <button onClick={addFacility}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white shrink-0"
                    style={{ background: 'var(--terracotta)' }}>เพิ่ม</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.facilities.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(135,168,120,0.15)', color: '#0F6E56' }}>
                      {f}
                      <button onClick={() => removeFacility(i)} className="hover:opacity-70"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Nearby */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>สถานที่ใกล้เคียง</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={nearbyInput}
                    onChange={e => setNearbyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNearby() } }}
                    placeholder="เช่น โรงพยาบาลสมิติเวช — ~2 กม."
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
                  <button onClick={addNearby}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white shrink-0"
                    style={{ background: 'var(--terracotta)' }}>เพิ่ม</button>
                </div>
                <div className="space-y-1">
                  {form.nearby.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(196,98,45,0.05)', color: 'var(--text-mid)' }}>
                      <span className="flex-1">• {n}</span>
                      <button onClick={() => removeNearby(i)} className="hover:opacity-70 shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--terracotta)' }}>
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDeleteId(null)} />
          <div className="relative rounded-2xl p-6 shadow-xl max-w-sm w-full" style={{ background: 'white' }}>
            <h3 className="font-serif font-bold mb-2" style={{ color: 'var(--brown)' }}>ยืนยันลบ?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-mid)' }}>
              ทรัพย์ที่ผูกกับโครงการนี้จะถูกปลด building ออก (ไม่ลบทรัพย์)
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>ยกเลิก</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: '#dc2626' }}>
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
