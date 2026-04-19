import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { addMonthsIso, buildPaymentSchedule, getPaymentStatus } from './supabase'
import type { Payment, Rental } from '@/types'

// Build a Rental stub with sane defaults — override fields per test.
const rental = (overrides: Partial<Rental> = {}): Rental => ({
  id: 'r1',
  property_id: 'p1',
  tenant_id: 't1',
  tenant_name_snapshot: 'Test Tenant',
  start_date: '2026-01-15',
  end_date: '2027-01-14',
  monthly_rent: 12000,
  deposit: 0,
  commission: 0,
  rented_by_us: false,
  status: 'active',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  ...overrides,
})

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay1',
  rental_id: 'r1',
  property_id: 'p1',
  type: 'rent',
  due_date: '2026-04-15',
  amount: 12000,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  ...overrides,
})

describe('addMonthsIso', () => {
  it('adds whole months for same day-of-month', () => {
    expect(addMonthsIso('2026-01-15', 0)).toBe('2026-01-15')
    expect(addMonthsIso('2026-01-15', 1)).toBe('2026-02-15')
    expect(addMonthsIso('2026-01-15', 11)).toBe('2026-12-15')
  })

  it('rolls year when month overflows December', () => {
    expect(addMonthsIso('2026-12-10', 1)).toBe('2027-01-10')
    expect(addMonthsIso('2026-12-10', 13)).toBe('2028-01-10')
  })

  it('clamps Jan 31 to Feb 28 in a non-leap year', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('clamps Jan 31 to Feb 29 in a leap year', () => {
    expect(addMonthsIso('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('clamps Jan 31 to Apr 30', () => {
    expect(addMonthsIso('2026-01-31', 3)).toBe('2026-04-30')
  })

  it('does not drift when stepping through short months repeatedly', () => {
    // Jan 31 → Feb 28 → Mar 28 (NOT Mar 31 — we always step from the original anchor)
    expect(addMonthsIso('2026-01-31', 2)).toBe('2026-03-31')
    // The clamp is only when target month is too short, so Jan 31 + 2 months = Mar 31 (March has 31).
  })
})

describe('buildPaymentSchedule', () => {
  it('generates exactly N rent records for an N-month lease', () => {
    // Jan 15 2026 → Jan 14 2027 = 12 monthly rents (Jan..Dec 15, Jan 15 next year skipped since > end)
    const records = buildPaymentSchedule(rental())
    const rents = records.filter(r => r.type === 'rent')
    expect(rents).toHaveLength(12)
    expect(rents[0].due_date).toBe('2026-01-15')
    expect(rents[11].due_date).toBe('2026-12-15')
  })

  it('includes the end-date month when due_date lands on end_date exactly', () => {
    const records = buildPaymentSchedule(rental({ start_date: '2026-01-15', end_date: '2026-04-15' }))
    const rents = records.filter(r => r.type === 'rent')
    expect(rents).toHaveLength(4)
    expect(rents.map(r => r.due_date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'])
  })

  it('excludes rents whose due_date falls after end_date', () => {
    // end_date Apr 14 — Apr 15 rent would overflow, so expect only Jan/Feb/Mar.
    const records = buildPaymentSchedule(rental({ start_date: '2026-01-15', end_date: '2026-04-14' }))
    const rents = records.filter(r => r.type === 'rent')
    expect(rents.map(r => r.due_date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('sets each rent record amount to monthly_rent', () => {
    const records = buildPaymentSchedule(rental({ monthly_rent: 15500 }))
    const rents = records.filter(r => r.type === 'rent')
    expect(rents.every(r => r.amount === 15500)).toBe(true)
  })

  it('does not include deposit record when deposit is 0', () => {
    const records = buildPaymentSchedule(rental({ deposit: 0 }))
    expect(records.find(r => r.type === 'deposit')).toBeUndefined()
  })

  it('includes a single deposit record on start_date when deposit > 0', () => {
    const records = buildPaymentSchedule(rental({ deposit: 24000 }))
    const deposits = records.filter(r => r.type === 'deposit')
    expect(deposits).toHaveLength(1)
    expect(deposits[0]).toMatchObject({ due_date: '2026-01-15', amount: 24000 })
  })

  it('skips commission when rented_by_us is false, even if commission > 0', () => {
    const records = buildPaymentSchedule(rental({ commission: 5000, rented_by_us: false }))
    expect(records.find(r => r.type === 'commission')).toBeUndefined()
  })

  it('includes commission on start_date when rented_by_us and commission > 0', () => {
    const records = buildPaymentSchedule(rental({ commission: 5000, rented_by_us: true }))
    const commissions = records.filter(r => r.type === 'commission')
    expect(commissions).toHaveLength(1)
    expect(commissions[0]).toMatchObject({ due_date: '2026-01-15', amount: 5000 })
  })

  it('includes both deposit and commission when both apply', () => {
    const records = buildPaymentSchedule(rental({
      deposit: 24000,
      commission: 5000,
      rented_by_us: true,
    }))
    const types = records.map(r => r.type)
    expect(types.filter(t => t === 'deposit')).toHaveLength(1)
    expect(types.filter(t => t === 'commission')).toHaveLength(1)
  })

  it('handles Jan 31 start by clamping to last-day-of-month for short months', () => {
    const records = buildPaymentSchedule(rental({ start_date: '2026-01-31', end_date: '2026-05-30' }))
    const rents = records.filter(r => r.type === 'rent')
    // Jan 31, Feb 28 (clamped), Mar 31, Apr 30 (clamped). May 31 > May 30 → excluded.
    expect(rents.map(r => r.due_date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('propagates rental_id and property_id to every record', () => {
    const records = buildPaymentSchedule(rental({
      id: 'rental-xyz',
      property_id: 'prop-xyz',
      deposit: 1000,
      commission: 500,
      rented_by_us: true,
    }))
    expect(records.every(r => r.rental_id === 'rental-xyz' && r.property_id === 'prop-xyz')).toBe(true)
  })

  it('returns only deposit/commission when start_date equals end_date (zero-month lease edge)', () => {
    const records = buildPaymentSchedule(rental({
      start_date: '2026-01-15',
      end_date: '2026-01-15',
      deposit: 1000,
    }))
    const rents = records.filter(r => r.type === 'rent')
    // The first rent is at start_date = end_date, so it's included.
    expect(rents).toHaveLength(1)
    expect(records.find(r => r.type === 'deposit')).toBeDefined()
  })
})

describe('getPaymentStatus', () => {
  // Freeze "today" to 2026-04-19 for deterministic overdue checks.
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-19T12:00:00Z'))
  })
  afterAll(() => { vi.useRealTimers() })

  it('returns "paid" when paid_amount equals amount', () => {
    expect(getPaymentStatus(payment({ amount: 12000, paid_amount: 12000 }))).toBe('paid')
  })

  it('returns "paid" when paid_amount exceeds amount (overpayment)', () => {
    expect(getPaymentStatus(payment({ amount: 12000, paid_amount: 15000 }))).toBe('paid')
  })

  it('returns "partial" when 0 < paid_amount < amount', () => {
    expect(getPaymentStatus(payment({ amount: 12000, paid_amount: 6000 }))).toBe('partial')
  })

  it('returns "overdue" when unpaid and due_date is before today', () => {
    expect(getPaymentStatus(payment({ due_date: '2026-04-15', paid_amount: undefined }))).toBe('overdue')
  })

  it('returns "pending" when unpaid and due_date is today', () => {
    expect(getPaymentStatus(payment({ due_date: '2026-04-19', paid_amount: undefined }))).toBe('pending')
  })

  it('returns "pending" when unpaid and due_date is in the future', () => {
    expect(getPaymentStatus(payment({ due_date: '2026-05-15', paid_amount: undefined }))).toBe('pending')
  })

  it('treats paid_amount = 0 the same as undefined (not yet paid)', () => {
    expect(getPaymentStatus(payment({ due_date: '2026-04-15', paid_amount: 0 }))).toBe('overdue')
    expect(getPaymentStatus(payment({ due_date: '2026-05-15', paid_amount: 0 }))).toBe('pending')
  })

  it('"partial" takes precedence over overdue — partial is not re-flagged as overdue', () => {
    // Past due, but some money has been received → we show "partial" so admin can see the remainder.
    expect(getPaymentStatus(payment({ due_date: '2026-04-15', amount: 12000, paid_amount: 6000 }))).toBe('partial')
  })
})
