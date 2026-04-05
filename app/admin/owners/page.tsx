'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, MessageCircle, Users } from 'lucide-react'
import { getOwners, createOwner, updateOwner, deleteOwner } from '@/lib/supabase'
import type { Owner } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

const EMPTY_FORM = { name: '', phone: '', email: '', line_id: '', source: '', note: '' }

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Owner | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getOwners().then(data => { setOwners(data); setLoading(false) })
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (o: Owner) => {
    setEditing(o)
    setForm({ name: o.name, phone: o.phone, email: o.email || '', line_id: o.line_id || '', source: o.source || '', note: o.note || '' })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('กรุณากรอกชื่อเจ้าของ'); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        line_id: form.line_id.trim() || undefined,
        source: form.source.trim() || undefined,
        note: form.note.trim() || undefined,
      }
      if (editing) {
        const updated = await updateOwner(editing.id, payload)
        setOwners(prev => prev.map(o => o.id === editing.id ? updated : o))
      } else {
        const created = await createOwner(payload)
        setOwners(prev => [created, ...prev])
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
    try {
      await deleteOwner(deleteId)
      setOwners(prev => prev.filter(o => o.id !== deleteId))
    } catch {
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>จัดการเจ้าของ</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {loading ? '...' : `${owners.length} คน`}
            </p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มเจ้าของใหม่
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-sm" style={{ color: 'var(--text-light)' }}>กำลังโหลด...</div>
          </div>
        ) : owners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีข้อมูลเจ้าของ</p>
            <button onClick={openAdd}
              className="text-sm font-medium" style={{ color: 'var(--terracotta)' }}>
              เพิ่มเจ้าของแรก
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(196,98,45,0.08)', background: 'var(--cream)' }}>
                  {['ชื่อ', 'ติดต่อ', 'เจอจากไหน', 'หมายเหตุ', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--text-light)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {owners.map(o => (
                  <tr key={o.id} className="border-b transition-colors"
                    style={{ borderColor: 'rgba(196,98,45,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,240,232,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm" style={{ color: 'var(--brown)' }}>{o.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {o.phone && (
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
                            <Phone size={11} /> {o.phone}
                          </span>
                        )}
                        {o.email && (
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
                            <Mail size={11} /> {o.email}
                          </span>
                        )}
                        {o.line_id && (
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-mid)' }}>
                            <MessageCircle size={11} /> {o.line_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{o.source || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: 'var(--text-light)' }}>{o.note || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(o)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteId(o.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !saving && setModalOpen(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--brown)' }}>
              {editing ? 'แก้ไขข้อมูลเจ้าของ' : 'เพิ่มเจ้าของใหม่'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ชื่อ <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input className={FIELD} style={FIELD_STYLE} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น สมศักดิ์ วงศ์ทอง" />
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
                    placeholder="@owner" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>อีเมล</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.email} type="email"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="owner@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เจอเจ้าของจากไหน</label>
                <input className={FIELD} style={FIELD_STYLE} value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="เช่น Facebook, แนะนำโดยลูกค้า..." />
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
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มเจ้าของ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>ยืนยันการลบ</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              ข้อมูลเจ้าของนี้จะถูกลบถาวร ทรัพย์ที่เชื่อมอยู่จะไม่มีเจ้าของ
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
                {deleting ? 'กำลังลบ...' : 'ลบเจ้าของ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
