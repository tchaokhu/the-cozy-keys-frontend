'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Share2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  listPostingPlatforms,
  createPostingPlatform,
  updatePostingPlatform,
  deletePostingPlatform,
} from '@/lib/supabase'
import type { PostingPlatform } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

export default function AdminPlatformsPage() {
  const [platforms, setPlatforms] = useState<PostingPlatform[]>([])
  const [loading, setLoading] = useState(true)

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editPlatform, setEditPlatform] = useState<PostingPlatform | null>(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    listPostingPlatforms().then(data => { setPlatforms(data); setLoading(false) })
  }, [])

  const openAdd = () => {
    setAddName('')
    setAddError('')
    setAddOpen(true)
  }

  const handleAdd = async () => {
    if (!addName.trim()) { setAddError('กรุณากรอกชื่อช่องทาง'); return }
    setAddSaving(true)
    setAddError('')
    try {
      const created = await createPostingPlatform(addName.trim())
      setPlatforms(prev => [...prev, created])
      setAddOpen(false)
    } catch {
      setAddError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setAddSaving(false)
    }
  }

  const openEdit = (p: PostingPlatform) => {
    setEditPlatform(p)
    setEditName(p.name)
    setEditActive(p.active)
    setEditError('')
  }

  const handleEdit = async () => {
    if (!editPlatform) return
    if (!editName.trim()) { setEditError('กรุณากรอกชื่อช่องทาง'); return }
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await updatePostingPlatform(editPlatform.id, { name: editName.trim(), active: editActive })
      setPlatforms(prev => prev.map(p => p.id === editPlatform.id ? updated : p))
      setEditPlatform(null)
    } catch {
      setEditError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setEditSaving(false)
    }
  }

  const handleMoveUp = async (platform: PostingPlatform) => {
    const idx = platforms.findIndex(p => p.id === platform.id)
    if (idx <= 0) return
    const prev = platforms[idx - 1]
    const newOrder = prev.sort_order
    const prevOrder = platform.sort_order
    try {
      const [updA, updB] = await Promise.all([
        updatePostingPlatform(platform.id, { sort_order: newOrder }),
        updatePostingPlatform(prev.id, { sort_order: prevOrder }),
      ])
      setPlatforms(current => {
        const copy = [...current]
        copy[idx] = updA
        copy[idx - 1] = updB
        return copy.sort((a, b) => a.sort_order - b.sort_order)
      })
    } catch {
      alert('เรียงลำดับไม่สำเร็จ')
    }
  }

  const handleMoveDown = async (platform: PostingPlatform) => {
    const idx = platforms.findIndex(p => p.id === platform.id)
    if (idx < 0 || idx >= platforms.length - 1) return
    const next = platforms[idx + 1]
    const newOrder = next.sort_order
    const nextOrder = platform.sort_order
    try {
      const [updA, updB] = await Promise.all([
        updatePostingPlatform(platform.id, { sort_order: newOrder }),
        updatePostingPlatform(next.id, { sort_order: nextOrder }),
      ])
      setPlatforms(current => {
        const copy = [...current]
        copy[idx] = updA
        copy[idx + 1] = updB
        return copy.sort((a, b) => a.sort_order - b.sort_order)
      })
    } catch {
      alert('เรียงลำดับไม่สำเร็จ')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deletePostingPlatform(deleteId)
      setPlatforms(prev => prev.filter(p => p.id !== deleteId))
    } catch {
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: Column<PostingPlatform>[] = [
    {
      key: 'sort_order',
      label: 'ลำดับ',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-4 w-8 rounded mx-auto" />,
      render: p => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleMoveUp(p)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-light)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
            title="เลื่อนขึ้น"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => handleMoveDown(p)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-light)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
            title="เลื่อนลง"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'ชื่อช่องทาง',
      headerAlign: 'center',
      skeleton: <div className="skeleton h-4 w-32 rounded" />,
      render: p => (
        <span className="font-medium text-sm" style={{ color: 'var(--brown)' }}>{p.name}</span>
      ),
    },
    {
      key: 'active',
      label: 'สถานะ',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-6 w-16 rounded-full mx-auto" />,
      render: p => (
        <span
          className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={
            p.active
              ? { background: 'rgba(135,168,120,0.15)', color: '#0F6E56' }
              : { background: 'rgba(196,98,45,0.1)', color: 'var(--text-light)' }
          }
        >
          {p.active ? 'ใช้งาน' : 'ปิดใช้'}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-24 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>ช่องทางโพสต์</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              {loading ? '...' : `${platforms.length} ช่องทาง`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}
          >
            <Plus size={16} /> เพิ่มช่องทาง
          </button>
        </div>

        {!loading && platforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Share2 size={40} style={{ color: 'var(--text-light)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ยังไม่มีช่องทางโพสต์</p>
            <button onClick={openAdd} className="text-sm font-medium" style={{ color: 'var(--terracotta)' }}>
              เพิ่มช่องทางแรก
            </button>
          </div>
        ) : (
          <AdminTable<PostingPlatform>
            columns={columns}
            data={platforms}
            rowKey={p => p.id}
            loading={loading}
            skeletonRows={4}
            headerVariant="terracotta"
            minWidth={500}
            renderActions={p => (
              <>
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                >
                  <Edit2 size={15} />
                </button>
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
              </div>
            }
          />
        )}
      </main>

      {/* Add modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !addSaving && setAddOpen(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--brown)' }}>
              เพิ่มช่องทางโพสต์
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                ชื่อช่องทาง <span style={{ color: 'var(--terracotta)' }}>*</span>
              </label>
              <input
                className={FIELD}
                style={FIELD_STYLE}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="เช่น Facebook Page, DDProperty..."
                autoFocus
              />
            </div>
            {addError && (
              <p className="mt-3 text-xs px-3 py-2 rounded-lg"
                style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>
                {addError}
              </p>
            )}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setAddOpen(false)}
                disabled={addSaving}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={addSaving}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: 'var(--terracotta)', opacity: addSaving ? 0.7 : 1 }}
              >
                {addSaving ? 'กำลังบันทึก...' : 'เพิ่มช่องทาง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editPlatform && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !editSaving && setEditPlatform(null)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--brown)' }}>
              แก้ไขช่องทางโพสต์
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  ชื่อช่องทาง <span style={{ color: 'var(--terracotta)' }}>*</span>
                </label>
                <input
                  className={FIELD}
                  style={FIELD_STYLE}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="ชื่อช่องทาง"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-mid)' }}>สถานะ</label>
                <button
                  onClick={() => setEditActive(v => !v)}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: editActive ? '#0F6E56' : 'var(--text-light)' }}
                >
                  {editActive
                    ? <ToggleRight size={22} style={{ color: '#0F6E56' }} />
                    : <ToggleLeft size={22} style={{ color: 'var(--text-light)' }} />
                  }
                  {editActive ? 'ใช้งาน' : 'ปิดใช้'}
                </button>
              </div>
            </div>
            {editError && (
              <p className="mt-3 text-xs px-3 py-2 rounded-lg"
                style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>
                {editError}
              </p>
            )}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setEditPlatform(null)}
                disabled={editSaving}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: 'var(--terracotta)', opacity: editSaving ? 0.7 : 1 }}
              >
                {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}
        >
          <div
            className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>ยืนยันการลบ</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              ลบช่องทางนี้จะลบสถานะของทุกทรัพย์ที่ใช้ช่องทางนี้ด้วย
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: '#dc2626', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'กำลังลบ...' : 'ลบช่องทาง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
