'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Star, Plus, GripVertical, AlertTriangle, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import {
  getPostTemplate,
  updatePostTemplate,
  deletePostTemplate,
  setDefaultPostTemplate,
  getProperties,
} from '@/lib/supabase'
import { renderTemplate, DEFAULT_STYLE, type PostExtras } from '@/lib/postTemplateRenderer'
import type { PostTemplate, PostTemplateSection, PostSectionKey, Property } from '@/types'

const SECTION_KEYS: PostSectionKey[] = [
  'header', 'description', 'details', 'facilities', 'nearby', 'price', 'cta', 'hashtags', 'divider', 'custom_text',
]

const SECTION_LABEL: Record<PostSectionKey, string> = {
  header: 'หัวเรื่อง / ชื่อโพสต์',
  description: 'คำโปรย (Tagline)',
  details: 'รายละเอียดห้อง',
  facilities: 'สิ่งอำนวยความสะดวก',
  nearby: 'สถานที่ใกล้เคียง',
  price: 'ราคา',
  cta: 'ช่องทางติดต่อ',
  hashtags: 'แฮชแท็ก',
  divider: 'เส้นคั่น',
  custom_text: 'ข้อความเอง',
}

const PREVIEW_EXTRAS: PostExtras = {
  taglineTH: 'ห้องสวย พร้อมเข้าอยู่ วิวสระว่ายน้ำ',
  taglineEN: 'Beautiful unit, move-in ready, pool view',
  furnished: 'fully',
  nearbyMain: 'Robinson Sriracha',
  priceTiers: [
    { label: '6 เดือน', labelEN: '6 months', price: '17000' },
  ],
  deposit: '2 เดือน',
  facilityLines: 'สระว่ายน้ำ\nฟิตเนส\nสวนพักผ่อน\nที่จอดรถ',
  nearbyLines: 'Robinson 1.2 km\nนิคมแหลมฉบัง 3 km\nMakro 2 km',
}

export default function EditPostTemplatePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [template, setTemplate] = useState<PostTemplate | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<PostTemplateSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [previewPropertyId, setPreviewPropertyId] = useState<string>('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([getPostTemplate(id), getProperties()])
      .then(([tpl, props]) => {
        if (!tpl) {
          setError('ไม่พบเทมเพลต')
          setLoading(false)
          return
        }
        setTemplate(tpl)
        setName(tpl.name)
        setNotes(tpl.notes ?? '')
        setSections(tpl.sections)
        setProperties(props)
        setPreviewPropertyId(props[0]?.id ?? '')
        setLoading(false)
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'โหลดข้อมูลล้มเหลว')
        setLoading(false)
      })
  }, [id])

  const previewProperty = useMemo(
    () => properties.find(p => p.id === previewPropertyId) ?? null,
    [properties, previewPropertyId],
  )

  const livePreview = useMemo(() => {
    if (!previewProperty) return { th: '', en: '' }
    const tpl: PostTemplate = template
      ? { ...template, sections, name, notes }
      : { id, name, is_default: false, sections, created_at: '', updated_at: '', notes }
    return {
      th: renderTemplate(tpl, previewProperty, PREVIEW_EXTRAS, DEFAULT_STYLE, 'th'),
      en: renderTemplate(tpl, previewProperty, PREVIEW_EXTRAS, DEFAULT_STYLE, 'en'),
    }
  }, [template, sections, name, notes, previewProperty, id])

  const updateSection = (i: number, patch: Partial<PostTemplateSection>) => {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
    setDirty(true)
  }

  const updateOption = (i: number, opt: Partial<NonNullable<PostTemplateSection['options']>>) => {
    setSections(prev => prev.map((s, idx) =>
      idx === i ? { ...s, options: { ...(s.options || {}), ...opt } } : s,
    ))
    setDirty(true)
  }

  const removeSection = (i: number) => {
    setSections(prev => prev.filter((_, idx) => idx !== i))
    setDirty(true)
  }

  const addSection = (key: PostSectionKey) => {
    const newSection: PostTemplateSection = {
      key,
      enabled: true,
      label_th: '',
      label_en: '',
      ...(key === 'custom_text' ? { options: { text_th: '', text_en: '' } } : {}),
    }
    setSections(prev => [...prev, newSection])
    setDirty(true)
  }

  const onDragStart = (i: number) => setDragIndex(i)
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    setSections(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIndex(i)
    setDirty(true)
  }
  const onDragEnd = () => setDragIndex(null)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('ชื่อเทมเพลตห้ามว่าง')
      return
    }
    if (sections.length === 0) {
      if (!window.confirm('เทมเพลตว่างเปล่า บันทึกต่อไปหรือไม่?')) return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await updatePostTemplate(id, { name: name.trim(), notes: notes.trim() || undefined, sections })
      setTemplate(updated)
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกล้มเหลว')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!template || template.is_default) return
    if (!window.confirm(`ลบเทมเพลต "${template.name}"? การกระทำนี้ย้อนกลับไม่ได้`)) return
    try {
      await deletePostTemplate(id)
      router.push('/admin/post-templates')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบล้มเหลว')
    }
  }

  const handleSetDefault = async () => {
    if (!template || template.is_default) return
    try {
      await setDefaultPostTemplate(id)
      const refreshed = await getPostTemplate(id)
      if (refreshed) setTemplate(refreshed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ตั้งค่าเริ่มต้นล้มเหลว')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
        <AdminSidebar />
        <main className="flex-1 p-8 pt-20 md:pt-24 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--terracotta)' }} />
        </main>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
        <AdminSidebar />
        <main className="flex-1 p-8 pt-20 md:pt-24">
          <div className="rounded-xl p-4 text-sm border"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
            {error || 'ไม่พบเทมเพลต'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-24 overflow-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/post-templates')}
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-mid)', background: 'white', border: '1px solid rgba(196,98,45,0.1)' }}
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>แก้ไขเทมเพลต</h1>
            {template.is_default && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                <Star size={11} fill="currentColor" /> ค่าเริ่มต้น
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!template.is_default && (
              <button
                onClick={handleSetDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}
              >
                <Star size={14} /> ตั้งเป็นค่าเริ่มต้น
              </button>
            )}
            {!template.is_default && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border"
                style={{ background: 'white', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}
              >
                <Trash2 size={14} /> ลบ
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--terracotta)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              บันทึก
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm border"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: editor */}
          <div className="space-y-4">
            <div className="rounded-2xl border p-5"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ชื่อเทมเพลต</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setDirty(true) }}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border mb-3"
                style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
              />
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>หมายเหตุ (ภายใน)</label>
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setDirty(true) }}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border resize-none"
                style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
              />
            </div>

            <div className="rounded-2xl border p-5"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>
                  Sections ({sections.length})
                </h3>
              </div>

              {sections.length === 0 && (
                <div className="rounded-xl p-3 mb-3 text-xs border flex items-center gap-2"
                  style={{ background: 'rgba(239,159,39,0.08)', borderColor: 'rgba(239,159,39,0.2)', color: '#854F0B' }}>
                  <AlertTriangle size={14} /> เทมเพลตว่างเปล่า — เพิ่ม section ก่อนบันทึก
                </div>
              )}

              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => onDragOver(e, i)}
                    onDragEnd={onDragEnd}
                    className="rounded-xl border p-3"
                    style={{
                      background: 'var(--cream)',
                      borderColor: dragIndex === i ? 'var(--terracotta)' : 'rgba(196,98,45,0.1)',
                      opacity: dragIndex === i ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" className="cursor-grab" style={{ color: 'var(--text-light)' }}>
                        <GripVertical size={14} />
                      </button>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'white', color: 'var(--terracotta)', border: '1px solid rgba(196,98,45,0.15)' }}>
                        {SECTION_LABEL[s.key]}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-mid)' }}>
                        <input type="checkbox" checked={s.enabled} onChange={e => updateSection(i, { enabled: e.target.checked })} />
                        เปิดใช้
                      </label>
                      <button type="button" onClick={() => removeSection(i)}
                        className="ml-auto p-1 rounded" style={{ color: '#dc2626' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Labels only affect output for these section types: */}
                    {(s.key === 'facilities' || s.key === 'nearby' || s.key === 'divider') && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={s.label_th}
                          onChange={e => updateSection(i, { label_th: e.target.value })}
                          placeholder={s.key === 'divider' ? 'ตัวคั่น (TH) — ว่าง = ค่าเริ่มต้น' : 'หัวข้อ (TH)'}
                          className="px-3 py-1.5 rounded-lg text-xs outline-none border"
                          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}
                        />
                        <input
                          type="text"
                          value={s.label_en}
                          onChange={e => updateSection(i, { label_en: e.target.value })}
                          placeholder={s.key === 'divider' ? 'Separator (EN) — empty = default' : 'Heading (EN)'}
                          className="px-3 py-1.5 rounded-lg text-xs outline-none border"
                          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}
                        />
                      </div>
                    )}

                    {(s.key === 'facilities' || s.key === 'nearby') && (
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                        <span>จำนวนสูงสุด:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={s.options?.max_items ?? ''}
                          onChange={e => updateOption(i, { max_items: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="ไม่จำกัด"
                          className="w-20 px-2 py-1 rounded text-xs outline-none border"
                          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}
                        />
                      </div>
                    )}

                    {s.key === 'custom_text' && (
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <textarea
                          value={s.options?.text_th ?? ''}
                          onChange={e => updateOption(i, { text_th: e.target.value })}
                          placeholder="ข้อความ (TH)"
                          rows={2}
                          className="px-3 py-1.5 rounded-lg text-xs outline-none border resize-none"
                          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}
                        />
                        <textarea
                          value={s.options?.text_en ?? ''}
                          onChange={e => updateOption(i, { text_en: e.target.value })}
                          placeholder="Text (EN)"
                          rows={2}
                          className="px-3 py-1.5 rounded-lg text-xs outline-none border resize-none"
                          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}
                        />
                      </div>
                    )}

                    {/* Sections that use property data automatically; no editable label/text */}
                    {!['facilities', 'nearby', 'divider', 'custom_text'].includes(s.key) && (
                      <p className="text-[11px] italic" style={{ color: 'var(--text-light)' }}>
                        ส่วนนี้ใช้ข้อมูลจากทรัพย์ + style knobs โดยอัตโนมัติ — ปรับได้แค่เปิด/ปิด หรือลำดับ
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-mid)' }}>เพิ่ม section:</div>
                <div className="flex flex-wrap gap-1.5">
                  {SECTION_KEYS.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addSection(k)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border"
                      style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}
                    >
                      <Plus size={11} /> {SECTION_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            <div className="rounded-2xl border p-5"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-semibold" style={{ color: 'var(--brown)' }}>ตัวอย่างผลลัพธ์</h3>
                <select
                  value={previewPropertyId}
                  onChange={e => setPreviewPropertyId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none border"
                  style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                >
                  {properties.length === 0 && <option value="">ไม่มีทรัพย์</option>}
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-light)' }}>🇹🇭 ภาษาไทย</div>
                  <pre className="text-xs whitespace-pre-wrap p-3 rounded-xl border max-h-[400px] overflow-auto font-sans"
                    style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}>
                    {livePreview.th || '— ไม่มีเนื้อหา —'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-light)' }}>🇬🇧 English</div>
                  <pre className="text-xs whitespace-pre-wrap p-3 rounded-xl border max-h-[400px] overflow-auto font-sans"
                    style={{ background: 'var(--cream)', borderColor: 'rgba(196,98,45,0.1)', color: 'var(--text-dark)' }}>
                    {livePreview.en || '— No content —'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
