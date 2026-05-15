'use client'
import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Plus, FileText, Paperclip, Trash2, Download, Eye } from 'lucide-react'
import { createRental, updateRental, endRental, createTenant, getTenants, listRentalDocuments, uploadRentalDocument, deleteRentalDocument } from '@/lib/supabase'
import { getRentalDocumentSignedUrl } from '@/app/admin/rentals/actions'
import type { Rental, Tenant, Property, RentalDocument } from '@/types'
import SearchableSelect from './SearchableSelect'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

const END_REASONS = [
  'หมดสัญญา',
  'ผู้เช่ายกเลิก',
  'ไม่จ่ายค่าเช่า',
  'อื่นๆ',
]

export type RentalModalMode = 'create' | 'edit' | 'end'

interface Props {
  mode: RentalModalMode
  property: Property
  rental?: Rental
  forceRentedByUs?: boolean
  onClose: () => void
  onSaved: (rental: Rental) => void
}

interface FormState {
  tenantId: string
  newTenantName: string
  newTenantPhone: string
  startDate: string
  endDate: string
  monthlyRent: string
  deposit: string
  commission: string
  rentedByUs: boolean
  note: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function buildInitialForm(mode: RentalModalMode, property: Property, rental?: Rental, forceRentedByUs?: boolean): FormState {
  if ((mode === 'edit' || mode === 'end') && rental) {
    return {
      tenantId: rental.tenant_id || '',
      newTenantName: '',
      newTenantPhone: '',
      startDate: rental.start_date,
      endDate: rental.end_date,
      monthlyRent: String(rental.monthly_rent),
      deposit: String(rental.deposit ?? 0),
      commission: String(rental.commission ?? 0),
      rentedByUs: rental.rented_by_us,
      note: rental.note || '',
    }
  }
  return {
    tenantId: '',
    newTenantName: '',
    newTenantPhone: '',
    startDate: todayIso(),
    endDate: '',
    monthlyRent: String(property.price_monthly),
    deposit: '',
    commission: '',
    rentedByUs: forceRentedByUs ?? false,
    note: '',
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(n / 1024)} KB`
}

export default function RentalModal({ mode, property, rental, forceRentedByUs = false, onClose, onSaved }: Props) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantMode, setTenantMode] = useState<'existing' | 'new'>('existing')
  const [form, setForm] = useState<FormState>(() => buildInitialForm(mode, property, rental, forceRentedByUs))
  const [endReason, setEndReason] = useState(END_REASONS[0])
  const [endReasonOther, setEndReasonOther] = useState('')
  const [endNote, setEndNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Document state
  const [existingDocs, setExistingDocs] = useState<RentalDocument[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadingDocs, setUploadingDocs] = useState(false)

  useEffect(() => {
    getTenants().then(setTenants).catch(() => setTenants([]))
  }, [])

  // Load existing docs in edit mode
  useEffect(() => {
    if (mode === 'edit' && rental?.id) {
      listRentalDocuments(rental.id).then(setExistingDocs).catch(() => setExistingDocs([]))
    }
  }, [mode, rental?.id])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const title = useMemo(() => {
    if (mode === 'create') return 'สร้างสัญญาเช่า'
    if (mode === 'edit') return 'แก้ไขสัญญาเช่า'
    return 'ปิดสัญญาเช่า'
  }, [mode])

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removePending = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDeleteExisting = async (doc: RentalDocument) => {
    try {
      await deleteRentalDocument(doc.id)
      setExistingDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (e) {
      alert('ลบไฟล์ไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    }
  }

  const handleOpenDoc = async (doc: RentalDocument, forceDownload = false) => {
    try {
      const result = await getRentalDocumentSignedUrl(doc.id, forceDownload)
      if (result.disposition === 'inline') {
        window.open(result.url, '_blank')
      } else {
        const res = await fetch(result.url)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = result.fileName
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch (e) {
      alert('เปิดไฟล์ไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    }
  }

  const handleCreateOrEdit = async () => {
    setError('')

    if (!form.startDate || !form.endDate) {
      setError('กรุณาระบุวันเริ่ม-สิ้นสุดสัญญา')
      return
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError('วันสิ้นสุดสัญญาต้องหลังวันเริ่มสัญญา')
      return
    }
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
      setError('กรุณาระบุค่าเช่ารายเดือน')
      return
    }

    // Resolve tenant
    let tenantId: string | undefined
    let tenantNameSnapshot = ''
    let tenantPhoneSnapshot: string | undefined

    if (tenantMode === 'new') {
      if (!form.newTenantName.trim()) {
        setError('กรุณากรอกชื่อผู้เช่าใหม่')
        return
      }
      setSaving(true)
      try {
        const created = await createTenant({
          name: form.newTenantName.trim(),
          phone: form.newTenantPhone.trim() || undefined,
        })
        tenantId = created.id
        tenantNameSnapshot = created.name
        tenantPhoneSnapshot = created.phone
      } catch {
        setError('สร้างผู้เช่าใหม่ไม่สำเร็จ')
        setSaving(false)
        return
      }
    } else {
      if (!form.tenantId) {
        setError('กรุณาเลือกผู้เช่า หรือกด "เพิ่มผู้เช่าใหม่"')
        return
      }
      const t = tenants.find(x => x.id === form.tenantId)
      if (!t) { setError('ไม่พบผู้เช่าที่เลือก'); return }
      tenantId = t.id
      tenantNameSnapshot = t.name
      tenantPhoneSnapshot = t.phone
      setSaving(true)
    }

    try {
      const payload = {
        property_id: property.id,
        tenant_id: tenantId,
        tenant_name_snapshot: tenantNameSnapshot,
        tenant_phone_snapshot: tenantPhoneSnapshot,
        start_date: form.startDate,
        end_date: form.endDate,
        monthly_rent: Number(form.monthlyRent),
        deposit: Number(form.deposit || 0),
        commission: Number(form.commission || 0),
        rented_by_us: forceRentedByUs || form.rentedByUs,
        status: 'active' as const,
        note: form.note.trim() || undefined,
      }
      const saved = mode === 'edit' && rental
        ? await updateRental(rental.id, payload)
        : await createRental(payload)

      // Upload pending documents
      if (pendingFiles.length > 0) {
        setUploadingDocs(true)
        const failedFiles: string[] = []
        for (const file of pendingFiles) {
          try {
            await uploadRentalDocument(saved.id, file)
          } catch (e) {
            failedFiles.push(`${file.name}: ${e instanceof Error ? e.message : 'ผิดพลาด'}`)
          }
        }
        setUploadingDocs(false)
        if (failedFiles.length > 0) {
          alert('อัปโหลดเอกสารบางไฟล์ไม่สำเร็จ:\n' + failedFiles.join('\n'))
        }
      }

      onSaved(saved)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('rentals_one_active_per_property')) {
        setError('ทรัพย์นี้มีสัญญาเช่าที่ active อยู่แล้ว กรุณาปิดสัญญาเดิมก่อน')
      } else {
        setError('บันทึกไม่สำเร็จ: ' + (msg || 'กรุณาลองใหม่'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEnd = async () => {
    if (!rental) return
    setError('')
    const reason = endReason === 'อื่นๆ' ? endReasonOther.trim() : endReason
    if (!reason) { setError('กรุณาระบุเหตุผล'); return }
    setSaving(true)
    try {
      const ended = await endRental(rental.id, {
        ended_reason: reason,
        note: endNote.trim() || undefined,
      })
      onSaved(ended)
    } catch (e) {
      setError('ปิดสัญญาไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'กรุณาลองใหม่'))
    } finally {
      setSaving(false)
    }
  }

  const isBusy = saving || uploadingDocs

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={() => !isBusy && onClose()}>
      <div className="rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-5">
          {mode === 'end' ? <KeyRound size={18} style={{ color: 'var(--terracotta)' }} /> : <FileText size={18} style={{ color: 'var(--terracotta)' }} />}
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>{title}</h2>
        </div>

        <div className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(196,98,45,0.06)', color: 'var(--text-mid)' }}>
          <span className="font-medium">ทรัพย์: </span>{property.title_en || property.title}
          <span className="ml-1" style={{ color: 'var(--text-light)' }}>({property.district})</span>
        </div>

        {mode === 'end' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เหตุผลที่ปิดสัญญา</label>
              <select className={FIELD} style={FIELD_STYLE} value={endReason} onChange={e => setEndReason(e.target.value)}>
                {END_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {endReason === 'อื่นๆ' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ระบุเหตุผล</label>
                <input className={FIELD} style={FIELD_STYLE} value={endReasonOther}
                  onChange={e => setEndReasonOther(e.target.value)} placeholder="พิมพ์เหตุผล..." />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>หมายเหตุเพิ่มเติม</label>
              <textarea className={FIELD} style={FIELD_STYLE} rows={3} value={endNote}
                onChange={e => setEndNote(e.target.value)} placeholder="บันทึกเพิ่มเติม..." />
            </div>
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,159,39,0.1)', color: '#854F0B' }}>
              เมื่อปิดสัญญา ทรัพย์จะเปลี่ยนสถานะเป็น &quot;ว่าง&quot; อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tenant selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: 'var(--text-mid)' }}>ผู้เช่า</label>
                {mode === 'create' && (
                  <button type="button" onClick={() => setTenantMode(tenantMode === 'existing' ? 'new' : 'existing')}
                    className="text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--terracotta)' }}>
                    {tenantMode === 'existing' ? <><Plus size={12} /> เพิ่มผู้เช่าใหม่</> : 'เลือกจากรายการ'}
                  </button>
                )}
              </div>
              {tenantMode === 'existing' || mode !== 'create' ? (
                <SearchableSelect
                  value={form.tenantId}
                  onChange={v => set('tenantId', v)}
                  placeholder="— เลือกผู้เช่า —"
                  emptyLabel="— ไม่ระบุผู้เช่า —"
                  searchPlaceholder="ค้นหาชื่อ/เบอร์..."
                  options={tenants.map(t => ({ value: t.id, label: t.name, sub: t.phone }))}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input className={FIELD} style={FIELD_STYLE} value={form.newTenantName}
                    onChange={e => set('newTenantName', e.target.value)} placeholder="ชื่อผู้เช่า *" />
                  <input className={FIELD} style={FIELD_STYLE} value={form.newTenantPhone}
                    onChange={e => set('newTenantPhone', e.target.value)} placeholder="เบอร์โทร" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>วันเริ่มสัญญา *</label>
                <input type="date" className={FIELD} style={FIELD_STYLE} value={form.startDate}
                  onChange={e => set('startDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>วันสิ้นสุดสัญญา *</label>
                <input type="date" className={FIELD} style={FIELD_STYLE} value={form.endDate}
                  onChange={e => set('endDate', e.target.value)} />
              </div>
            </div>

            {/* ค่าแรกเข้า group */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--brown)' }}>ค่าแรกเข้า</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ค่าเช่า/เดือน *</label>
                  <input type="number" className={FIELD} style={FIELD_STYLE} value={form.monthlyRent}
                    onChange={e => set('monthlyRent', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>เงินประกัน</label>
                  <input type="number" className={FIELD} style={FIELD_STYLE} value={form.deposit}
                    onChange={e => set('deposit', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ค่านายหน้า</label>
                  <input type="number" className={FIELD} style={FIELD_STYLE} value={form.commission}
                    onChange={e => set('commission', e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>

            {/* rented_by_us: hidden when forceRentedByUs, read-only label in edit, checkbox in create */}
            {forceRentedByUs ? null : mode === 'edit' ? (
              <p className="text-xs" style={{ color: 'var(--text-mid)' }}>
                เช่าผ่านเรา: <span className="font-medium" style={{ color: 'var(--text-dark)' }}>
                  {form.rentedByUs ? 'ใช่' : 'ไม่ใช่'}
                </span>
              </p>
            ) : (
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-mid)' }}>
                <input type="checkbox" checked={form.rentedByUs}
                  onChange={e => set('rentedByUs', e.target.checked)}
                  style={{ accentColor: 'var(--terracotta)' }} />
                เช่าผ่านเรา (รับค่านายหน้า)
              </label>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>หมายเหตุ</label>
              <textarea className={FIELD} style={FIELD_STYLE} rows={2} value={form.note}
                onChange={e => set('note', e.target.value)} placeholder="บันทึกเพิ่มเติม..." />
            </div>

            {/* เอกสารสัญญา */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={13} style={{ color: 'var(--terracotta)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--brown)' }}>เอกสารสัญญา</p>
              </div>

              {/* Existing docs (edit mode only) */}
              {existingDocs.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {existingDocs.map(doc => (
                    <div key={doc.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
                      style={{ borderColor: 'rgba(196,98,45,0.15)', background: 'rgba(196,98,45,0.03)' }}>
                      <FileText size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                      <span className="flex-1 truncate" style={{ color: 'var(--text-dark)' }}>{doc.file_name}</span>
                      <span style={{ color: 'var(--text-light)', flexShrink: 0 }}>{formatBytes(doc.size_bytes)}</span>
                      <button type="button" onClick={() => handleOpenDoc(doc, false)}
                        className="p-1 rounded hover:opacity-70" style={{ color: 'var(--terracotta)' }} title="ดูไฟล์">
                        <Eye size={12} />
                      </button>
                      <button type="button" onClick={() => handleOpenDoc(doc, true)}
                        className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-mid)' }} title="ดาวน์โหลด">
                        <Download size={12} />
                      </button>
                      <button type="button" onClick={() => handleDeleteExisting(doc)}
                        className="p-1 rounded hover:opacity-70" style={{ color: '#dc2626' }} title="ลบ">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files */}
              {pendingFiles.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {pendingFiles.map((file, idx) => (
                    <div key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
                      style={{ borderColor: 'rgba(196,98,45,0.15)', background: 'rgba(196,98,45,0.04)' }}>
                      <FileText size={12} style={{ color: 'var(--terracotta)', flexShrink: 0 }} />
                      <span className="flex-1 truncate" style={{ color: 'var(--text-dark)' }}>{file.name}</span>
                      <span style={{ color: 'var(--text-light)', flexShrink: 0 }}>{formatBytes(file.size)}</span>
                      <button type="button" onClick={() => removePending(idx)}
                        className="p-1 rounded hover:opacity-70" style={{ color: '#dc2626' }} title="ยกเลิก">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: 'rgba(196,98,45,0.3)', color: 'var(--terracotta)', background: 'white' }}>
                <Plus size={12} /> เพิ่มไฟล์
                <input type="file" multiple className="sr-only"
                  accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFilePick} />
              </label>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-light)' }}>
                PDF, DOCX, JPG, PNG, WEBP — สูงสุด 20 MB ต่อไฟล์
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs px-3 py-2 rounded-lg"
            style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>{error}</p>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} disabled={isBusy}
            className="px-4 py-2 rounded-xl text-sm border"
            style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
            ยกเลิก
          </button>
          <button onClick={mode === 'end' ? handleEnd : handleCreateOrEdit} disabled={isBusy}
            className="px-4 py-2 rounded-xl text-sm text-white font-medium"
            style={{ background: mode === 'end' ? '#dc2626' : 'var(--terracotta)', opacity: isBusy ? 0.7 : 1 }}>
            {uploadingDocs ? 'กำลังอัปโหลดเอกสาร...' : saving ? 'กำลังบันทึก...' : mode === 'end' ? 'ปิดสัญญา' : mode === 'edit' ? 'บันทึก' : 'สร้างสัญญา'}
          </button>
        </div>
      </div>
    </div>
  )
}
