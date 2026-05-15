'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { updatePayment } from '@/lib/supabase'
import type { Payment } from '@/types'

const FIELD = 'w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors'
const FIELD_STYLE = { background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }

const METHOD_OPTIONS: { v: 'cash' | 'transfer' | 'other'; label: string }[] = [
  { v: 'transfer', label: 'โอน' },
  { v: 'cash', label: 'เงินสด' },
  { v: 'other', label: 'อื่นๆ' },
]

const TYPE_LABEL: Record<string, string> = {
  rent: 'ค่าเช่า', deposit: 'เงินประกัน', commission: 'ค่านายหน้า', other: 'อื่นๆ',
}

interface Props {
  payment: Payment
  onClose: () => void
  onSaved: (payment: Payment) => void
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function PaymentMarkPaidModal({ payment, onClose, onSaved }: Props) {
  const alreadyPaid = payment.paid_amount ?? 0
  const remaining = Math.max(0, payment.amount - alreadyPaid)

  const [paidDate, setPaidDate] = useState(payment.paid_date || todayIso())
  const [paidAmount, setPaidAmount] = useState(String(alreadyPaid > 0 ? payment.amount : payment.amount))
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>(payment.method || 'transfer')
  const [note, setNote] = useState(payment.note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    const amt = Number(paidAmount)
    // paid_date and paid_amount must move together — DB CHECK enforces this
    // too (payments_paid_pair_consistent), but catch it here for a clear error.
    if (!paidDate || !amt) {
      setError('กรุณาระบุทั้งวันที่จ่ายและจำนวนเงิน')
      return
    }
    if (amt <= 0) { setError('จำนวนเงินต้องมากกว่า 0'); return }
    if (amt > payment.amount * 2) {
      setError('จำนวนเงินสูงผิดปกติ กรุณาตรวจสอบอีกครั้ง')
      return
    }
    setSaving(true)
    try {
      const updated = await updatePayment(payment.id, {
        paid_date: paidDate,
        paid_amount: amt,
        method,
        note: note.trim() || undefined,
      })
      onSaved(updated)
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'กรุณาลองใหม่'))
    } finally {
      setSaving(false)
    }
  }

  const handleClearPaid = async () => {
    if (!confirm('ยกเลิกการชำระเงินนี้?')) return
    setSaving(true)
    try {
      const updated = await updatePayment(payment.id, {
        paid_date: null,
        paid_amount: null,
        method: null,
      } as unknown as Partial<Payment>)
      onSaved(updated)
    } catch (e) {
      setError('ยกเลิกไม่สำเร็จ: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={() => !saving && onClose()}>
      <div className="rounded-2xl p-6 w-full max-w-md shadow-xl"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-5">
          <CheckCircle size={18} style={{ color: 'var(--terracotta)' }} />
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>
            บันทึกการชำระเงิน
          </h2>
        </div>

        <div className="text-xs mb-4 px-3 py-2 rounded-lg space-y-0.5"
          style={{ background: 'rgba(196,98,45,0.06)', color: 'var(--text-mid)' }}>
          <div>
            <span className="font-medium">{TYPE_LABEL[payment.type]}</span>
            {' · '}กำหนด: {new Date(payment.due_date).toLocaleDateString('th-TH')}
          </div>
          <div>
            จำนวน: <span className="font-serif font-semibold" style={{ color: 'var(--terracotta)' }}>
              ฿{payment.amount.toLocaleString()}
            </span>
            {alreadyPaid > 0 && (
              <> · จ่ายแล้ว ฿{alreadyPaid.toLocaleString()} · เหลือ ฿{remaining.toLocaleString()}</>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>วันที่จ่าย *</label>
              <input type="date" className={FIELD} style={FIELD_STYLE} value={paidDate}
                onChange={e => setPaidDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>จำนวนที่จ่าย *</label>
              <input type="number" className={FIELD} style={FIELD_STYLE} value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>ช่องทาง</label>
            <div className="flex gap-2">
              {METHOD_OPTIONS.map(opt => (
                <button type="button" key={opt.v} onClick={() => setMethod(opt.v)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border transition-all"
                  style={{
                    background: method === opt.v ? 'var(--terracotta)' : 'white',
                    borderColor: method === opt.v ? 'var(--terracotta)' : 'rgba(196,98,45,0.2)',
                    color: method === opt.v ? 'white' : 'var(--text-mid)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>หมายเหตุ</label>
            <textarea className={FIELD} style={FIELD_STYLE} rows={2} value={note}
              onChange={e => setNote(e.target.value)} placeholder="เช่น เลขที่ slip, รายละเอียด..." />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs px-3 py-2 rounded-lg"
            style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.08)' }}>{error}</p>
        )}

        <div className="flex gap-3 justify-between mt-6">
          {alreadyPaid > 0 ? (
            <button onClick={handleClearPaid} disabled={saving}
              className="px-3 py-2 rounded-xl text-xs border"
              style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
              ยกเลิกการชำระ
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm border"
              style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm text-white font-medium"
              style={{ background: 'var(--terracotta)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
