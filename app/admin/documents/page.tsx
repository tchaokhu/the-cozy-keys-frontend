'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, X, Download, FileText, Eye } from 'lucide-react'
import {
  listDocumentTemplates,
  uploadDocumentTemplate,
  deleteDocumentTemplate,
} from '@/lib/supabase'
import { getDocumentSignedUrl } from './actions'
import type { DocumentTemplate, DocumentTemplateCategory } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTable, { Column } from '@/components/admin/AdminTable'

const DOCUMENT_CATEGORY_LABELS: Record<DocumentTemplateCategory, string> = {
  rental_contract: 'สัญญาเช่า',
  agency_contract: 'สัญญา agency',
  receipt: 'ใบเสร็จ',
  other: 'อื่นๆ',
}

const CATEGORIES: DocumentTemplateCategory[] = ['rental_contract', 'agency_contract', 'receipt', 'other']

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(n / 1024)} KB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface FormState {
  category: DocumentTemplateCategory
  title: string
  description: string
  pdfFile: File | null
  docxFile: File | null
  removePdf: boolean
  removeDocx: boolean
}

const BLANK_FORM: FormState = {
  category: 'rental_contract',
  title: '',
  description: '',
  pdfFile: null,
  docxFile: null,
  removePdf: false,
  removeDocx: false,
}

export default function DocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<DocumentTemplateCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const docxInputRef = useRef<HTMLInputElement>(null)
  const perPage = 15

  useEffect(() => {
    listDocumentTemplates().then(data => { setTemplates(data); setLoading(false) })
  }, [])

  useEffect(() => { setCurrentPage(1) }, [categoryFilter, searchQuery])

  const openNew = () => {
    setEditingId(null)
    setEditingTemplate(null)
    setForm(BLANK_FORM)
    setModalOpen(true)
  }

  const openEdit = (t: DocumentTemplate) => {
    setEditingId(t.id)
    setEditingTemplate(t)
    setForm({
      category: t.category,
      title: t.title,
      description: t.description ?? '',
      pdfFile: null,
      docxFile: null,
      removePdf: false,
      removeDocx: false,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return

    // Validate: at least one variant must be present after changes
    if (!editingId) {
      if (!form.pdfFile && !form.docxFile) {
        alert('กรุณาเลือกไฟล์ PDF หรือ DOCX อย่างน้อย 1 ไฟล์')
        return
      }
    } else {
      const pdfWillExist = !form.removePdf && (form.pdfFile ? true : !!editingTemplate?.pdf_storage_path)
      const docxWillExist = !form.removeDocx && (form.docxFile ? true : !!editingTemplate?.docx_storage_path)
      if (!pdfWillExist && !docxWillExist) {
        alert('ต้องมีไฟล์อย่างน้อย 1 รูปแบบ (PDF หรือ DOCX)')
        return
      }
    }

    setSaving(true)
    try {
      const result = await uploadDocumentTemplate({
        id: editingId ?? undefined,
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim() || null,
        pdfFile: form.pdfFile,
        docxFile: form.docxFile,
        removePdf: form.removePdf,
        removeDocx: form.removeDocx,
      })
      if (editingId) {
        setTemplates(prev => prev.map(t => t.id === result.id ? result : t))
      } else {
        setTemplates(prev => [result, ...prev])
      }
      setModalOpen(false)
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewPdf = async (id: string) => {
    try {
      const result = await getDocumentSignedUrl(id, 'pdf')
      window.open(result.url, '_blank')
    } catch (e) {
      alert('เปิดดูไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    }
  }

  const handleDownload = async (id: string, format: 'pdf' | 'docx') => {
    try {
      const result = await getDocumentSignedUrl(id, format, false)
      const res = await fetch(result.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (e) {
      alert('ดาวน์โหลดไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteDocumentTemplate(deleteId)
      setTemplates(prev => prev.filter(t => t.id !== deleteId))
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const pickFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    ext: 'pdf' | 'docx',
    field: 'pdfFile' | 'docxFile'
  ) => {
    const f = e.target.files?.[0] ?? null
    if (f) {
      const fileExt = (f.name.split('.').pop() || '').toLowerCase()
      if (fileExt !== ext) {
        alert(ext === 'pdf' ? 'ต้องเป็นไฟล์ .pdf เท่านั้น' : 'ต้องเป็นไฟล์ .docx เท่านั้น')
        e.target.value = ''
        return
      }
      if (f.size > 20 * 1024 * 1024) {
        alert('ไฟล์ใหญ่เกิน 20MB')
        e.target.value = ''
        return
      }
    }
    setForm(prev => ({ ...prev, [field]: f }))
  }

  let filtered = templates
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === categoryFilter)
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false) ||
      (t.pdf_file_name?.toLowerCase().includes(q) ?? false) ||
      (t.docx_file_name?.toLowerCase().includes(q) ?? false)
    )
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const columns: Column<DocumentTemplate>[] = [
    {
      key: 'title',
      label: 'ชื่อเอกสาร',
      skeleton: (
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-44" />
          <div className="skeleton h-3 w-32" />
        </div>
      ),
      render: t => (
        <>
          <div className="font-medium text-sm" style={{ color: 'var(--text-dark)' }}>{t.title}</div>
          {t.description && (
            <div className="text-xs truncate max-w-xs" style={{ color: 'var(--text-mid)' }}>{t.description}</div>
          )}
          {t.pdf_file_name && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>PDF: {t.pdf_file_name}</div>
          )}
          {t.docx_file_name && (
            <div className="text-xs" style={{ color: 'var(--text-light)' }}>DOCX: {t.docx_file_name}</div>
          )}
        </>
      ),
    },
    {
      key: 'category',
      label: 'หมวด',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-6 w-24 rounded-full mx-auto" />,
      render: t => (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
          {DOCUMENT_CATEGORY_LABELS[t.category]}
        </span>
      ),
    },
    {
      key: 'size',
      label: 'ขนาด',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-4 w-16 mx-auto" />,
      render: t => (
        <div className="text-xs space-y-0.5" style={{ color: 'var(--text-mid)' }}>
          {t.pdf_size_bytes != null
            ? <div>PDF {formatBytes(t.pdf_size_bytes)}</div>
            : <div style={{ color: 'var(--text-light)' }}>PDF —</div>
          }
          {t.docx_size_bytes != null
            ? <div>DOCX {formatBytes(t.docx_size_bytes)}</div>
            : <div style={{ color: 'var(--text-light)' }}>DOCX —</div>
          }
        </div>
      ),
    },
    {
      key: 'updated_at',
      label: 'อัปเดตล่าสุด',
      headerAlign: 'center',
      cellAlign: 'center',
      skeleton: <div className="skeleton h-4 w-24 mx-auto" />,
      render: t => (
        <span className="text-sm" style={{ color: 'var(--text-mid)' }}>{formatDate(t.updated_at)}</span>
      ),
    },
  ]

  const isCreateDisabled = saving || !form.title.trim() || (!editingId && !form.pdfFile && !form.docxFile)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-8 pt-20 md:pt-24 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>เอกสารต้นแบบ</h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>{templates.length} เอกสาร</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--terracotta)' }}>
            <Plus size={16} /> เพิ่มเอกสาร
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as DocumentTemplateCategory | 'all')}
            className="px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}>
            <option value="all">ทั้งหมด</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อเอกสาร..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
            />
          </div>
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-light)' }} />
            <p style={{ color: 'var(--text-light)' }}>ยังไม่มีเอกสาร</p>
          </div>
        ) : (
          <AdminTable<DocumentTemplate>
            columns={columns}
            data={paginated}
            rowKey={t => t.id}
            loading={loading}
            skeletonRows={6}
            renderActions={t => (
              <>
                {t.pdf_storage_path && (
                  <button
                    onClick={() => handlePreviewPdf(t.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                    title="ดูตัวอย่าง PDF">
                    <Eye size={15} />
                    <span className="block text-[10px] leading-none mt-0.5">PDF</span>
                  </button>
                )}
                {t.pdf_storage_path && (
                  <button
                    onClick={() => handleDownload(t.id, 'pdf')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                    title="ดาวน์โหลด PDF">
                    <Download size={15} />
                    <span className="block text-[10px] leading-none mt-0.5">PDF</span>
                  </button>
                )}
                {t.docx_storage_path && (
                  <button
                    onClick={() => handleDownload(t.id, 'docx')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                    title="ดาวน์โหลด DOCX">
                    <Download size={15} />
                    <span className="block text-[10px] leading-none mt-0.5">DOCX</span>
                  </button>
                )}
                <button
                  onClick={() => openEdit(t)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}
                  title="แก้ไข">
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => setDeleteId(t.id)}
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setModalOpen(false)} />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl p-6 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>
                {editingId ? 'แก้ไขเอกสาร' : 'เพิ่มเอกสารใหม่'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-light)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>หมวดหมู่ *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value as DocumentTemplateCategory }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>ชื่อเอกสาร *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น สัญญาเช่าคอนโด 1 ปี"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>คำอธิบาย (ไม่บังคับ)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                  style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
                />
              </div>

              {/* File pickers */}
              <div className="grid grid-cols-2 gap-3">
                {/* PDF picker */}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>ไฟล์ PDF</label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => pickFile(e, 'pdf', 'pdfFile')}
                  />
                  {editingTemplate?.pdf_file_name && !form.removePdf && !form.pdfFile ? (
                    <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(196,98,45,0.15)' }}>
                      <div className="truncate" style={{ color: 'var(--text-dark)' }}>{editingTemplate.pdf_file_name}</div>
                      {editingTemplate.pdf_size_bytes != null && (
                        <div style={{ color: 'var(--text-light)' }}>{formatBytes(editingTemplate.pdf_size_bytes)}</div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => pdfInputRef.current?.click()}
                          className="text-[11px]"
                          style={{ color: 'var(--terracotta)' }}>
                          แทนที่
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, removePdf: true }))}
                          className="text-[11px]"
                          style={{ color: '#dc2626' }}>
                          ลบไฟล์นี้
                        </button>
                      </div>
                    </div>
                  ) : form.removePdf ? (
                    <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(196,98,45,0.15)', color: '#dc2626' }}>
                      จะลบไฟล์ PDF
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, removePdf: false }))}
                        className="ml-2 text-[11px]"
                        style={{ color: 'var(--terracotta)' }}>
                        เลิกทำ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border text-left"
                      style={{ borderColor: 'rgba(196,98,45,0.15)', color: form.pdfFile ? 'var(--text-dark)' : 'var(--text-light)' }}>
                      {form.pdfFile ? form.pdfFile.name : 'เลือก PDF...'}
                    </button>
                  )}
                </div>

                {/* DOCX picker */}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-mid)' }}>ไฟล์ Word (.docx)</label>
                  <input
                    ref={docxInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={e => pickFile(e, 'docx', 'docxFile')}
                  />
                  {editingTemplate?.docx_file_name && !form.removeDocx && !form.docxFile ? (
                    <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(196,98,45,0.15)' }}>
                      <div className="truncate" style={{ color: 'var(--text-dark)' }}>{editingTemplate.docx_file_name}</div>
                      {editingTemplate.docx_size_bytes != null && (
                        <div style={{ color: 'var(--text-light)' }}>{formatBytes(editingTemplate.docx_size_bytes)}</div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => docxInputRef.current?.click()}
                          className="text-[11px]"
                          style={{ color: 'var(--terracotta)' }}>
                          แทนที่
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, removeDocx: true }))}
                          className="text-[11px]"
                          style={{ color: '#dc2626' }}>
                          ลบไฟล์นี้
                        </button>
                      </div>
                    </div>
                  ) : form.removeDocx ? (
                    <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(196,98,45,0.15)', color: '#dc2626' }}>
                      จะลบไฟล์ DOCX
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, removeDocx: false }))}
                        className="ml-2 text-[11px]"
                        style={{ color: 'var(--terracotta)' }}>
                        เลิกทำ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => docxInputRef.current?.click()}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border text-left"
                      style={{ borderColor: 'rgba(196,98,45,0.15)', color: form.docxFile ? 'var(--text-dark)' : 'var(--text-light)' }}>
                      {form.docxFile ? form.docxFile.name : 'เลือก DOCX...'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px]" style={{ color: 'var(--text-light)' }}>
                รองรับ .pdf .docx เท่านั้น ขนาดไม่เกิน 20 MB ต่อไฟล์ — ต้องมีอย่างน้อย 1 รูปแบบ
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isCreateDisabled}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--terracotta)' }}>
                {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'สร้าง'}
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
              ไฟล์ทั้งหมดจะถูกลบออกจากระบบและ Storage ถาวร
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
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
