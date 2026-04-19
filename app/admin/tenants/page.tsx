'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Phone, Mail, MessageCircle, KeyRound, CreditCard } from 'lucide-react'
import { getTenants, createTenant, updateTenant, deleteTenant } from '@/lib/supabase'
import type { Tenant } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

const EMPTY_FORM = {
  name: '', phone: '', email: '', line_id: '',
  id_card: '', address: '', emergency_contact: '', note: '',
}

type SortKey = 'name'
type SortDir = 'asc' | 'desc'

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const perPage = 10

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
    getTenants().then(data => { setTenants(data); setLoading(false) })
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (t: Tenant) => {
    setEditing(t)
    setForm({
      name: t.name, phone: t.phone || '', email: t.email || '', line_id: t.line_id || '',
      id_card: t.id_card || '', address: t.address || '',
      emergency_contact: t.emergency_contact || '', note: t.note || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('กรุณากรอกชื่อผู้เช่า'); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        line_id: form.line_id.trim() || undefined,
        id_card: form.id_card.trim() || undefined,
        address: form.address.trim() || undefined,
        emergency_contact: form.emergency_contact.trim() || undefined,
        note: form.note.trim() || undefined,
      }
      if (editing) {
        const updated = await updateTenant(editing.id, payload)
        setTenants(prev => prev.map(t => t.id === editing.id ? updated : t))
      } else {
        const created = await createTenant(payload)
        setTenants(prev => [created, ...prev])
      }
      setModalOpen(false)
    } catch {
      setFormError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteTenant(deleteId)
      setTenants(prev => prev.filter(t => t.id !== deleteId))
      setDeleteId(null)
    } catch (e) {
      const msg = (e as Error).message
      if (msg === 'TENANT_HAS_ACTIVE_RENTAL') {
        setDeleteError('ผู้เช่ายังมีสัญญาเช่าที่ยังไม่ปิด — กรุณาปิดสัญญาทั้งหมดก่อนลบ')
      } else {
        setDeleteError('ลบไม่สำเร็จ กรุณาลองใหม่')
      }
    } finally {
      setDeleting(false)
    }
  }

  const deleteTarget = deleteId ? tenants.find(t => t.id === deleteId) : null
  const hasActiveRental = (deleteTarget?.active_rental_count ?? 0) > 0

  let filtered = tenants
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.phone?.toLowerCase().includes(q) ?? false) ||
      (t.email?.toLowerCase().includes(q) ?? false) ||
      (t.line_id?.toLowerCase().includes(q) ?? false) ||
      (t.id_card?.toLowerCase().includes(q) ?? false)
    )
  }

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'th')
      return sortDir === 'desc' ? -cmp : cmp
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: 'ชื่อผู้เช่า',
      sortable: true,
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-28 rounded" />,
      render: t => (
        <div className="font-medium text-sm" style={{ color: 'var(--brown)' }}>{t.name}</div>
      ),
    },
    {
      key: 'contact',
      label: 'ติดต่อ',
      headerAlign: 'center',
      skeleton: (
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      ),
      render: t => (
        <div className="flex flex-col gap-1">
          {t.phone && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
              <Phone size={11} /> {t.phone}
            </span>
          )}
          {t.email && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
              <Mail size={11} /> {t.email}
            </span>
          )}
          {t.line_id && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
              <MessageCircle size={11} /> {t.line_id}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'id_card',
      label: 'บัตรประชาชน',
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-28 rounded" />,
      render: t => t.id_card ? (
        <span className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--text-mid)' }}>
          <CreditCard size={12} /> {t.id_card}
        </span>
      ) : <span className="text-sm" style={{ color: 'var(--text-light)' }}>—</span>,
    },
    {
      key: 'emergency_contact',
      label: 'ติดต่อฉุกเฉิน',
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-24 rounded" />,
      render: t => (
        <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{t.emergency_contact || '—'}</span>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ผู้เช่า</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {loading ? '...' : `${tenants.length} คน`}
            </p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มผู้เช่าใหม่
          </button>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input type="text" placeholder="ค้นหาชื่อ / เบอร์ / อีเมล / LINE / บัตรประชาชน..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }} />
        </div>

        {!loading && tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <KeyRound size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีข้อมูลผู้เช่า</p>
            <button onClick={openAdd}
              className="text-sm font-medium" style={{ color: 'var(--terracotta)' }}>
              เพิ่มผู้เช่าคนแรก
            </button>
          </div>
        ) : (
          <AdminTable<Tenant>
            columns={columns}
            data={paginated}
            rowKey={t => t.id}
            loading={loading}
            skeletonRows={6}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={k => toggleSort(k as SortKey)}
            headerVariant="terracotta"
            minWidth={700}
            renderActions={t => {
              const locked = (t.active_rental_count ?? 0) > 0
              return (
                <>
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => { if (!locked) { setDeleteError(''); setDeleteId(t.id) } }}
                    disabled={locked}
                    title={locked ? 'ผู้เช่ามีสัญญาเช่าที่ยังไม่ปิด — ลบไม่ได้' : 'ลบผู้เช่า'}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-light)', opacity: locked ? 0.35 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={e => { if (!locked) e.currentTarget.style.color = 'var(--text-light)' }}>
                    <Trash2 size={15} />
                  </button>
                </>
              )
            }}
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
          />
        )}
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !saving && setModalOpen(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-auto"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--brown)' }}>
              {editing ? 'แก้ไขข้อมูลผู้เช่า' : 'เพิ่มผู้เช่าใหม่'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ชื่อ <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input className={FIELD} style={FIELD_STYLE} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น สมชาย ใจดี" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เบอร์โทร</label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="08X-XXX-XXXX" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>LINE ID</label>
                  <input className={FIELD} style={FIELD_STYLE} value={form.line_id}
                    onChange={e => setForm(f => ({ ...f, line_id: e.target.value }))}
                    placeholder="@tenant" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>อีเมล</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.email} type="email"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tenant@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เลขบัตรประชาชน</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.id_card}
                  onChange={e => setForm(f => ({ ...f, id_card: e.target.value }))}
                  placeholder="สำหรับสัญญา" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ที่อยู่ตามบัตร</label>
                <textarea className={FIELD} style={FIELD_STYLE} rows={2} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="ที่อยู่ตามบัตรประชาชน" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ติดต่อฉุกเฉิน</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.emergency_contact}
                  onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
                  placeholder="ชื่อและเบอร์ผู้ติดต่อได้" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>หมายเหตุ</label>
                <textarea className={FIELD} style={FIELD_STYLE} rows={2} value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="บันทึกเพิ่มเติม..." />
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-xs px-3 py-2 rounded-lg"
                style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>
                {formError}
              </p>
            )}

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setModalOpen(false)} disabled={saving}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: 'var(--terracotta)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มผู้เช่า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>
              {hasActiveRental ? 'ลบไม่ได้' : 'ยืนยันการลบ'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              {hasActiveRental
                ? `ผู้เช่ารายนี้ยังมีสัญญาเช่าที่ยังไม่ปิด ${deleteTarget?.active_rental_count} สัญญา — กรุณาปิดสัญญาทั้งหมดก่อนลบ`
                : 'ข้อมูลผู้เช่านี้จะถูกลบ แต่ประวัติสัญญาเช่ายังคงเก็บชื่อไว้ในระบบ'}
            </p>
            {deleteError && (
              <p className="text-xs px-3 py-2 rounded-lg mb-4"
                style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>
                {deleteError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
                {hasActiveRental ? 'ปิด' : 'ยกเลิก'}
              </button>
              {!hasActiveRental && (
                <button onClick={confirmDelete} disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                  style={{ background: '#dc2626', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? 'กำลังลบ...' : 'ลบผู้เช่า'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
