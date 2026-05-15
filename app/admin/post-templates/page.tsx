'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Copy, Star, FileText, Layers } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import {
  getPostTemplates,
  createPostTemplate,
  deletePostTemplate,
  setDefaultPostTemplate,
} from '@/lib/supabase'
import type { PostTemplate } from '@/types'

export default function PostTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState<string | null>(null)

  const load = async () => {
    try {
      const rows = await getPostTemplates()
      setTemplates(rows)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดรายการเทมเพลตล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleNew = async () => {
    setWorking('new')
    setError('')
    try {
      const base = templates.find(t => t.is_default) ?? templates[0]
      const sections = base?.sections ?? []
      const created = await createPostTemplate({
        name: `เทมเพลตใหม่ ${new Date().toLocaleDateString('th-TH')}`,
        is_default: false,
        sections,
        notes: '',
      })
      router.push(`/admin/post-templates/${created.id}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างเทมเพลตล้มเหลว')
      setWorking(null)
    }
  }

  const handleDuplicate = async (t: PostTemplate) => {
    setWorking(t.id)
    setError('')
    try {
      const dup = await createPostTemplate({
        name: `${t.name} (สำเนา)`,
        is_default: false,
        sections: t.sections,
        notes: t.notes,
      })
      router.push(`/admin/post-templates/${dup.id}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'คัดลอกล้มเหลว')
      setWorking(null)
    }
  }

  const handleDelete = async (t: PostTemplate) => {
    if (t.is_default) {
      setError('ไม่สามารถลบเทมเพลตเริ่มต้นได้ ตั้งเทมเพลตอื่นเป็นค่าเริ่มต้นก่อน')
      return
    }
    if (!window.confirm(`ลบเทมเพลต "${t.name}"? การกระทำนี้ย้อนกลับไม่ได้`)) return
    setWorking(t.id)
    setError('')
    try {
      await deletePostTemplate(t.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบล้มเหลว')
    } finally {
      setWorking(null)
    }
  }

  const handleSetDefault = async (t: PostTemplate) => {
    if (t.is_default) return
    setWorking(t.id)
    setError('')
    try {
      await setDefaultPostTemplate(t.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ตั้งค่าเริ่มต้นล้มเหลว')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-24 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>เทมเพลตโพสต์</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>{templates.length} เทมเพลต</p>
          </div>
          <button
            onClick={handleNew}
            disabled={working === 'new'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--terracotta)' }}
          >
            <Plus size={16} /> เพิ่มเทมเพลต
          </button>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm border"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="skeleton h-5 w-1/2 mb-3 rounded" />
                <div className="skeleton h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-light)' }} />
            <p style={{ color: 'var(--text-light)' }}>ยังไม่มีเทมเพลต</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
              ตรวจสอบว่าได้รัน migration 20260513_post_templates.sql แล้ว
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => {
              const sectionCount = Array.isArray(t.sections) ? t.sections.length : 0
              const enabledCount = Array.isArray(t.sections) ? t.sections.filter(s => s.enabled).length : 0
              return (
                <div key={t.id} className="rounded-2xl border p-5 transition-shadow"
                  style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-serif font-semibold truncate" style={{ color: 'var(--brown)' }}>
                          {t.name}
                        </h2>
                        {t.is_default && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                            <Star size={10} fill="currentColor" /> ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <div className="text-xs flex items-center gap-3" style={{ color: 'var(--text-light)' }}>
                        <span className="flex items-center gap-1"><Layers size={11} /> {enabledCount}/{sectionCount} sections</span>
                        <span>·</span>
                        <span>แก้ไขล่าสุด {new Date(t.updated_at).toLocaleDateString('th-TH')}</span>
                      </div>
                      {t.notes && (
                        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-mid)' }}>{t.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                    <button
                      onClick={() => router.push(`/admin/post-templates/${t.id}/edit`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: 'var(--cream)', color: 'var(--brown)' }}
                    >
                      <Edit2 size={14} /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDuplicate(t)}
                      disabled={working === t.id}
                      title="คัดลอก"
                      className="p-2 rounded-lg disabled:opacity-50 transition-colors"
                      style={{ color: 'var(--text-mid)', background: 'var(--cream)' }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleSetDefault(t)}
                      disabled={working === t.id || t.is_default}
                      title={t.is_default ? 'เป็นค่าเริ่มต้นอยู่แล้ว' : 'ตั้งเป็นค่าเริ่มต้น'}
                      className="p-2 rounded-lg disabled:opacity-30 transition-colors"
                      style={{ color: t.is_default ? 'var(--terracotta)' : 'var(--text-mid)', background: 'var(--cream)' }}
                    >
                      <Star size={14} fill={t.is_default ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={working === t.id || t.is_default}
                      title={t.is_default ? 'ลบค่าเริ่มต้นไม่ได้' : 'ลบ'}
                      className="p-2 rounded-lg disabled:opacity-30 transition-colors"
                      style={{ color: t.is_default ? 'var(--text-light)' : '#dc2626', background: 'var(--cream)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
