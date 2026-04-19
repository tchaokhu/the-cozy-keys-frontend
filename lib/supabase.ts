import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Property, Inquiry, Owner, Building, ScheduledPost, Tenant, Rental, Payment, PaymentStatus } from '@/types'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  _supabase = createClient(url, key)
  return _supabase
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const sb = getSupabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const sb = getSupabase()
  const { error } = await sb.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  if (session) return session

  // Session expired or missing — try refreshing with the refresh token
  const { data: { session: refreshed }, error } = await sb.auth.refreshSession()
  if (error || !refreshed) return null
  return refreshed
}

export function onAuthStateChange(callback: (session: unknown) => void) {
  const sb = getSupabase()
  return sb.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}

// ─── Rental expiry helpers ──────────────────────────────────────────────────
export const EXPIRING_SOON_DAYS = 30

export type RentalState = 'expired' | 'expiring' | 'active' | null

export function getRentalStatus(end_date?: string | null): { daysLeft: number | null; state: RentalState } {
  if (!end_date) return { daysLeft: null, state: null }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(end_date); end.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (daysLeft < 0) return { daysLeft, state: 'expired' }
  if (daysLeft <= EXPIRING_SOON_DAYS) return { daysLeft, state: 'expiring' }
  return { daysLeft, state: 'active' }
}

// Auto-expire: close active rentals whose end_date has passed,
// and flip their properties back to 'available'.
async function expireOverdueRentals(): Promise<void> {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { data: overdue, error: fetchErr } = await sb
    .from('rentals')
    .select('id, property_id')
    .eq('status', 'active')
    .lt('end_date', today)
  if (fetchErr) {
    console.warn('Auto-expire fetch failed:', fetchErr.message)
    return
  }
  if (!overdue || overdue.length === 0) return

  const rentalIds = overdue.map(r => r.id)
  const propertyIds = Array.from(new Set(overdue.map(r => r.property_id)))
  const now = new Date().toISOString()

  const { error: rErr } = await sb
    .from('rentals')
    .update({ status: 'ended', ended_at: now, ended_reason: 'หมดสัญญา', updated_at: now })
    .in('id', rentalIds)
  if (rErr) console.warn('Rental auto-expire update failed:', rErr.message)

  const { error: pErr } = await sb
    .from('properties')
    .update({ status: 'available', updated_at: now })
    .in('id', propertyIds)
    .eq('status', 'rented')
  if (pErr) console.warn('Property auto-expire update failed:', pErr.message)
}

// ─── Properties ──────────────────────────────────────────────────────────────
export async function getProperties(filters?: Partial<{
  district: string
  property_type: string
  min_price: number
  max_price: number
  bedrooms: number
  status: string
}>): Promise<Property[]> {
  const sb = getSupabase()
  await expireOverdueRentals()
  let query = sb.from('properties').select('*').order('created_at', { ascending: false })
  if (filters?.district) query = query.eq('district', filters.district)
  if (filters?.property_type) query = query.eq('property_type', filters.property_type)
  if (filters?.min_price) query = query.gte('price_monthly', filters.min_price)
  if (filters?.max_price) query = query.lte('price_monthly', filters.max_price)
  if (filters?.bedrooms) query = query.eq('bedrooms', filters.bedrooms)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data: props, error } = await query
  if (error) throw error
  if (!props || props.length === 0) return []

  // Manual joins
  const ownerIds = Array.from(new Set(props.map((p: Property) => p.owner_id).filter(Boolean))) as string[]
  let ownersMap: Record<string, Owner> = {}
  if (ownerIds.length > 0) {
    const { data: owners } = await sb.from('owners').select('*').in('id', ownerIds)
    if (owners) ownersMap = Object.fromEntries(owners.map((o: Owner) => [o.id, o]))
  }

  const buildingIds = Array.from(new Set(props.map((p: Property) => p.building_id).filter(Boolean))) as string[]
  let buildingsMap: Record<string, Building> = {}
  if (buildingIds.length > 0) {
    const { data: buildings } = await sb.from('buildings').select('*').in('id', buildingIds)
    if (buildings) buildingsMap = Object.fromEntries(buildings.map((b: Building) => [b.id, b]))
  }

  // Active rentals for rented properties
  const propIds = props.map((p: Property) => p.id)
  const { data: activeRentals } = await sb
    .from('rentals')
    .select('*')
    .in('property_id', propIds)
    .eq('status', 'active')
  const rentalsMap: Record<string, Rental> = {}
  const rentalTenantIds: string[] = []
  if (activeRentals) {
    for (const r of activeRentals as Rental[]) {
      rentalsMap[r.property_id] = r
      if (r.tenant_id) rentalTenantIds.push(r.tenant_id)
    }
  }
  let tenantsMap: Record<string, Tenant> = {}
  if (rentalTenantIds.length > 0) {
    const { data: tenants } = await sb.from('tenants').select('*').in('id', Array.from(new Set(rentalTenantIds)))
    if (tenants) tenantsMap = Object.fromEntries(tenants.map((t: Tenant) => [t.id, t]))
  }

  return props.map((p: Property) => {
    const rental = rentalsMap[p.id]
    return {
      ...p,
      owner: p.owner_id ? ownersMap[p.owner_id] : undefined,
      buildingInfo: p.building_id ? buildingsMap[p.building_id] : undefined,
      active_rental: rental
        ? { ...rental, tenant: rental.tenant_id ? tenantsMap[rental.tenant_id] : undefined }
        : undefined,
    }
  })
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('properties').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null

  if (data.building_id) {
    const { data: bld } = await sb.from('buildings').select('*').eq('id', data.building_id).maybeSingle()
    if (bld) data.buildingInfo = bld
  }

  const { data: rental } = await sb
    .from('rentals')
    .select('*')
    .eq('property_id', id)
    .eq('status', 'active')
    .maybeSingle()
  if (rental) {
    if (rental.tenant_id) {
      const { data: tenant } = await sb.from('tenants').select('*').eq('id', rental.tenant_id).maybeSingle()
      if (tenant) rental.tenant = tenant
    }
    data.active_rental = rental
  }

  return data
}

// ─── Inquiries ───────────────────────────────────────────────────────────────
export async function createInquiry(inquiry: Omit<Inquiry, 'id' | 'status' | 'created_at'>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('inquiries').insert([{ ...inquiry, status: 'new' }])
  if (error) throw error
}

export async function getInquiries(): Promise<Inquiry[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('inquiries')
    .select('*, property:properties(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateInquiryStatus(id: string, status: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('inquiries').update({ status }).eq('id', id)
  if (error) throw error
}

// ─── Images ──────────────────────────────────────────────────────────────────
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

export async function uploadPropertyImage(file: File): Promise<string> {
  const sb = getSupabase()
  const ext = file.name.split('.').pop()
  const path = `properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb.storage.from('property-images').upload(path, file, { upsert: false })
  if (error) {
    console.warn('Storage upload failed, falling back to data URL:', error.message)
    return fileToDataUrl(file)
  }
  const { data } = sb.storage.from('property-images').getPublicUrl(path)
  return data.publicUrl
}

export async function deletePropertyImage(url: string): Promise<void> {
  // Only delete from Storage if it's a Supabase Storage URL
  const match = url.match(/\/storage\/v1\/object\/public\/property-images\/(.+)$/)
  if (!match) return // data URL or external URL — nothing to delete
  const sb = getSupabase()
  const { error } = await sb.storage.from('property-images').remove([match[1]])
  if (error) console.warn('Storage delete failed:', error.message)
}

// ─── Properties CRUD ─────────────────────────────────────────────────────────
export async function createProperty(
  property: Omit<Property, 'id' | 'created_at' | 'updated_at'>
): Promise<Property> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('properties')
    .insert([property])
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

// Only send columns that exist in the properties table
const PROPERTY_COLUMNS = [
  'title', 'title_en', 'description', 'price_monthly', 'property_type',
  'bedrooms', 'bathrooms', 'area_sqm', 'floor', 'building', 'room_number',
  'location', 'district', 'province', 'status', 'rented_until', 'rented_by_us', 'images', 'contact_line', 'owner_id', 'building_id',
] as const

export async function updateProperty(
  id: string,
  property: Partial<Omit<Property, 'id' | 'created_at'>>
): Promise<Property> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const src = property as Record<string, unknown>
  for (const col of PROPERTY_COLUMNS) {
    if (col in src && src[col] !== undefined) payload[col] = src[col]
  }
  const { data, error } = await sb
    .from('properties')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Property not found')
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ─── Owners ──────────────────────────────────────────────────────────────────
export async function getOwners(): Promise<Owner[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('owners').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function createOwner(
  owner: Omit<Owner, 'id' | 'created_at'>
): Promise<Owner> {
  const sb = getSupabase()
  const { data, error } = await sb.from('owners').insert([owner]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateOwner(
  id: string,
  owner: Partial<Omit<Owner, 'id' | 'created_at'>>
): Promise<Owner> {
  const sb = getSupabase()
  const { data, error } = await sb.from('owners').update(owner).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Owner not found')
  return data
}

export async function deleteOwner(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('owners').delete().eq('id', id)
  if (error) throw error
}

// ─── Buildings ──────────────────────────────────────────────────────────────
export async function getBuildings(): Promise<Building[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('buildings').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function getBuildingById(id: string): Promise<Building | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('buildings').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

export async function createBuilding(
  building: Omit<Building, 'id' | 'created_at'>
): Promise<Building> {
  const sb = getSupabase()
  const { data, error } = await sb.from('buildings').insert([building]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateBuilding(
  id: string,
  building: Partial<Omit<Building, 'id' | 'created_at'>>
): Promise<Building> {
  const sb = getSupabase()
  const { data, error } = await sb.from('buildings').update(building).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Building not found')
  return data
}

export async function deleteBuilding(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('buildings').delete().eq('id', id)
  if (error) throw error
}

// ─── Tenants ────────────────────────────────────────────────────────────────
export async function getTenants(): Promise<Tenant[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('tenants').select('*').order('name')
  if (error) throw error
  const tenants = (data || []) as Tenant[]
  if (tenants.length === 0) return tenants
  const { data: activeRentals } = await sb
    .from('rentals')
    .select('tenant_id')
    .eq('status', 'active')
    .not('tenant_id', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of (activeRentals || []) as { tenant_id: string }[]) {
    counts[r.tenant_id] = (counts[r.tenant_id] || 0) + 1
  }
  return tenants.map(t => ({ ...t, active_rental_count: counts[t.id] || 0 }))
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('tenants').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

export async function createTenant(
  tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>
): Promise<Tenant> {
  const sb = getSupabase()
  const { data, error } = await sb.from('tenants').insert([tenant]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateTenant(
  id: string,
  tenant: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
): Promise<Tenant> {
  const sb = getSupabase()
  const payload = { ...tenant, updated_at: new Date().toISOString() }
  const { data, error } = await sb.from('tenants').update(payload).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Tenant not found')
  return data
}

export async function deleteTenant(id: string): Promise<void> {
  const sb = getSupabase()
  const { count, error: countErr } = await sb
    .from('rentals')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', id)
    .eq('status', 'active')
  if (countErr) throw countErr
  if ((count ?? 0) > 0) {
    throw new Error('TENANT_HAS_ACTIVE_RENTAL')
  }
  const { error } = await sb.from('tenants').delete().eq('id', id)
  if (error) throw error
}

// ─── Rentals ────────────────────────────────────────────────────────────────
const RENTAL_COLUMNS = [
  'property_id', 'tenant_id', 'tenant_name_snapshot', 'tenant_phone_snapshot',
  'start_date', 'end_date', 'monthly_rent', 'deposit', 'commission', 'rented_by_us',
  'status', 'ended_at', 'ended_reason', 'note',
] as const

async function hydrateRentals(rentals: Rental[]): Promise<Rental[]> {
  if (rentals.length === 0) return rentals
  const sb = getSupabase()
  const tenantIds = Array.from(new Set(rentals.map(r => r.tenant_id).filter(Boolean))) as string[]
  const propertyIds = Array.from(new Set(rentals.map(r => r.property_id)))
  let tenantsMap: Record<string, Tenant> = {}
  let propsMap: Record<string, Property> = {}
  if (tenantIds.length > 0) {
    const { data } = await sb.from('tenants').select('*').in('id', tenantIds)
    if (data) tenantsMap = Object.fromEntries(data.map((t: Tenant) => [t.id, t]))
  }
  if (propertyIds.length > 0) {
    const { data } = await sb.from('properties').select('*').in('id', propertyIds)
    if (data) propsMap = Object.fromEntries(data.map((p: Property) => [p.id, p]))
  }
  return rentals.map(r => ({
    ...r,
    tenant: r.tenant_id ? tenantsMap[r.tenant_id] : undefined,
    property: propsMap[r.property_id],
  }))
}

export async function getRentals(filters?: { status?: 'active' | 'ended' | 'cancelled' }): Promise<Rental[]> {
  const sb = getSupabase()
  let query = sb.from('rentals').select('*').order('end_date', { ascending: false })
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return hydrateRentals(data || [])
}

export async function getRentalsByProperty(propertyId: string): Promise<Rental[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('rentals')
    .select('*')
    .eq('property_id', propertyId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return hydrateRentals(data || [])
}

export async function getRentalById(id: string): Promise<Rental | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('rentals').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  const [hydrated] = await hydrateRentals([data])
  return hydrated
}

export async function getActiveRental(propertyId: string): Promise<Rental | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('rentals')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) return null
  const [hydrated] = await hydrateRentals([data])
  return hydrated
}

export async function createRental(
  rental: Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'tenant' | 'property'>
): Promise<Rental> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = {}
  const src = rental as Record<string, unknown>
  for (const col of RENTAL_COLUMNS) {
    if (col in src && src[col] !== undefined) payload[col] = src[col]
  }
  const { data, error } = await sb.from('rentals').insert([payload]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  // Keep property.status in sync when a new active rental is created
  if (data.status === 'active') {
    await sb.from('properties').update({ status: 'rented', updated_at: new Date().toISOString() }).eq('id', data.property_id)
  }
  // Auto-generate payment schedule for active rentals (rent + deposit + commission if applicable)
  if (data.status === 'active') {
    try { await generatePaymentSchedule(data) }
    catch (e) { console.warn('Payment schedule generation failed:', (e as Error).message) }
  }
  return data
}

export async function updateRental(
  id: string,
  rental: Partial<Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'tenant' | 'property'>>
): Promise<Rental> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const src = rental as Record<string, unknown>
  for (const col of RENTAL_COLUMNS) {
    if (col in src && src[col] !== undefined) payload[col] = src[col]
  }
  const { data, error } = await sb.from('rentals').update(payload).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Rental not found')
  return data
}

export async function endRental(
  id: string,
  opts: { ended_reason: string; note?: string }
): Promise<Rental> {
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('rentals')
    .update({
      status: 'ended',
      ended_at: now,
      ended_reason: opts.ended_reason,
      ...(opts.note !== undefined ? { note: opts.note } : {}),
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Rental not found')
  // Flip property back to available
  await sb.from('properties')
    .update({ status: 'available', updated_at: now })
    .eq('id', data.property_id)
    .eq('status', 'rented')
  // Delete unpaid payments with due_date after ended_at — keep historical records
  const endedDate = now.slice(0, 10)
  await sb.from('payments')
    .delete()
    .eq('rental_id', id)
    .gt('due_date', endedDate)
    .or('paid_amount.is.null,paid_amount.eq.0')
  return data
}

export async function deleteRental(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('rentals').delete().eq('id', id)
  if (error) throw error
}

// ─── Payments ───────────────────────────────────────────────────────────────
const PAYMENT_COLUMNS = [
  'rental_id', 'property_id', 'type', 'due_date', 'amount',
  'paid_date', 'paid_amount', 'method', 'note',
] as const

export function getPaymentStatus(p: Payment): PaymentStatus {
  const paid = p.paid_amount ?? 0
  if (paid >= p.amount) return 'paid'
  if (paid > 0) return 'partial'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(p.due_date); due.setHours(0, 0, 0, 0)
  if (due < today) return 'overdue'
  return 'pending'
}

// Add N months to a YYYY-MM-DD string, clamping to last day of target month
// (so Jan 31 + 1 month = Feb 28/29, not Mar 3).
export function addMonthsIso(iso: string, n: number): string {
  const d = new Date(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d.toISOString().slice(0, 10)
}

// Pure helper: build the payment records array for a rental.
// - one 'rent' record per month from start_date up to end_date (inclusive if still ≤ end_date)
// - 'deposit' record on start_date if deposit > 0
// - 'commission' record on start_date if commission > 0 AND rented_by_us
export function buildPaymentSchedule(rental: Rental): Array<Partial<Payment>> {
  const records: Array<Partial<Payment>> = []

  // Rent schedule
  const end = new Date(rental.end_date); end.setHours(0, 0, 0, 0)
  let i = 0
  while (true) {
    const due = addMonthsIso(rental.start_date, i)
    const dueDate = new Date(due); dueDate.setHours(0, 0, 0, 0)
    if (dueDate > end) break
    records.push({
      rental_id: rental.id,
      property_id: rental.property_id,
      type: 'rent',
      due_date: due,
      amount: rental.monthly_rent,
    })
    i++
    if (i > 600) break // safety guard (50 years)
  }

  // Deposit (one-time, due on start_date)
  if (rental.deposit && rental.deposit > 0) {
    records.push({
      rental_id: rental.id,
      property_id: rental.property_id,
      type: 'deposit',
      due_date: rental.start_date,
      amount: rental.deposit,
    })
  }

  // Commission (one-time, due on start_date, only if rented_by_us)
  if (rental.rented_by_us && rental.commission && rental.commission > 0) {
    records.push({
      rental_id: rental.id,
      property_id: rental.property_id,
      type: 'commission',
      due_date: rental.start_date,
      amount: rental.commission,
    })
  }

  return records
}

async function generatePaymentSchedule(rental: Rental): Promise<void> {
  const records = buildPaymentSchedule(rental)
  if (records.length === 0) return
  const sb = getSupabase()
  const { error } = await sb.from('payments').insert(records)
  if (error) throw error
}

async function hydratePayments(payments: Payment[]): Promise<Payment[]> {
  if (payments.length === 0) return payments
  const sb = getSupabase()
  const rentalIds = Array.from(new Set(payments.map(p => p.rental_id)))
  const propertyIds = Array.from(new Set(payments.map(p => p.property_id)))
  let rentalsMap: Record<string, Rental> = {}
  let propsMap: Record<string, Property> = {}
  if (rentalIds.length > 0) {
    const { data } = await sb.from('rentals').select('*').in('id', rentalIds)
    if (data) rentalsMap = Object.fromEntries((data as Rental[]).map(r => [r.id, r]))
  }
  if (propertyIds.length > 0) {
    const { data } = await sb.from('properties').select('*').in('id', propertyIds)
    if (data) propsMap = Object.fromEntries((data as Property[]).map(p => [p.id, p]))
  }
  return payments.map(p => ({
    ...p,
    rental: rentalsMap[p.rental_id],
    property: propsMap[p.property_id],
  }))
}

export async function getPayments(): Promise<Payment[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('payments').select('*').order('due_date', { ascending: true })
  if (error) throw error
  return hydratePayments((data || []) as Payment[])
}

export async function getPaymentsByRental(rentalId: string): Promise<Payment[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('rental_id', rentalId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return hydratePayments((data || []) as Payment[])
}

export async function createPayment(
  payment: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'rental' | 'property'>
): Promise<Payment> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = {}
  const src = payment as Record<string, unknown>
  for (const col of PAYMENT_COLUMNS) {
    if (col in src && src[col] !== undefined) payload[col] = src[col]
  }
  const { data, error } = await sb.from('payments').insert([payload]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data as Payment
}

export async function updatePayment(
  id: string,
  payment: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'rental' | 'property'>>
): Promise<Payment> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const src = payment as Record<string, unknown>
  for (const col of PAYMENT_COLUMNS) {
    if (col in src) payload[col] = src[col] // allow null to clear paid_date/paid_amount
  }
  const { data, error } = await sb.from('payments').update(payload).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Payment not found')
  return data as Payment
}

export async function deletePayment(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('payments').delete().eq('id', id)
  if (error) throw error
}

// ─── Scheduled Posts ────────────────────────────────────────────────────────
export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('scheduled_posts')
    .select('*, property:properties(*)')
    .order('scheduled_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createScheduledPost(
  post: Omit<ScheduledPost, 'id' | 'created_at' | 'property'>
): Promise<ScheduledPost> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('scheduled_posts')
    .insert([post])
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateScheduledPost(
  id: string,
  updates: Partial<Pick<ScheduledPost, 'scheduled_date' | 'scheduled_time' | 'status' | 'fb_post_id' | 'post_content_th' | 'post_content_en' | 'images'>>
): Promise<ScheduledPost> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Scheduled post not found')
  return data
}

export async function deleteScheduledPost(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('scheduled_posts').delete().eq('id', id)
  if (error) throw error
}
