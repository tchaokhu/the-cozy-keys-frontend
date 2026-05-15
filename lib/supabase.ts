import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Property, Inquiry, Owner, Building, Tenant, Rental, Payment, PaymentStatus, PostTemplate, DocumentTemplate, DocumentTemplateCategory, RentalDocument, PostingPlatform, PropertyPosting } from '@/types'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  _supabase = createBrowserClient(url, key)
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

// Discriminated result so callers can distinguish "user must log in again"
// from "transient network/refresh failure". Previously both collapsed to
// null, which forced callers to redirect on every blip.
export type SessionResult =
  | { kind: 'session'; session: NonNullable<Awaited<ReturnType<SupabaseClient['auth']['getSession']>>['data']['session']> }
  | { kind: 'expired' }
  | { kind: 'error'; error: Error }

export async function getSession(): Promise<SessionResult> {
  const sb = getSupabase()
  try {
    const { data: { session }, error: getErr } = await sb.auth.getSession()
    if (getErr) return { kind: 'error', error: getErr }
    if (session) return { kind: 'session', session }

    // No live session — try the refresh token.
    const { data: { session: refreshed }, error: refreshErr } = await sb.auth.refreshSession()
    if (refreshErr) {
      // refresh_token_not_found / invalid_grant / expired = user must sign in
      const msg = refreshErr.message.toLowerCase()
      if (msg.includes('refresh') || msg.includes('expired') || msg.includes('invalid')) {
        return { kind: 'expired' }
      }
      return { kind: 'error', error: refreshErr }
    }
    if (!refreshed) return { kind: 'expired' }
    return { kind: 'session', session: refreshed }
  } catch (e) {
    return { kind: 'error', error: e instanceof Error ? e : new Error(String(e)) }
  }
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

// Asia/Bangkok local date in YYYY-MM-DD. Using UTC here would mis-classify
// rentals around UTC midnight Bangkok evening — the same fix already applied
// in endRental() for payment cleanup.
function todayBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
}

// Close active rentals whose end_date has passed, flip their properties back
// to 'available'. Exposed only as an explicit admin call — previously this
// ran on every public listing fetch, which (a) silently no-op'd under RLS
// for anon users, and (b) issued writes from a read-only request. Now admins
// trigger it from the dashboard / property pages.
export async function expireOverdueRentals(): Promise<{ rentals: number; properties: number }> {
  const sb = getSupabase()
  const today = todayBangkok()
  const { data: overdue, error: fetchErr } = await sb
    .from('rentals')
    .select('id, property_id')
    .eq('status', 'active')
    .lt('end_date', today)
  if (fetchErr) {
    console.warn('Auto-expire fetch failed:', fetchErr.message)
    return { rentals: 0, properties: 0 }
  }
  if (!overdue || overdue.length === 0) return { rentals: 0, properties: 0 }

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

  return { rentals: rentalIds.length, properties: propertyIds.length }
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
  // expireOverdueRentals() used to run here, but it issued writes from a
  // read-only public path. Admin pages now trigger it explicitly.
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

  // Posting platforms hydration for the badge column
  const { data: allPostings } = await sb
    .from('property_postings')
    .select('*')
    .in('property_id', propIds)
    .eq('posted', true)
  const { data: allPlatforms } = await sb
    .from('posting_platforms')
    .select('id, name')
  const platformNameMap: Record<string, string> = {}
  if (allPlatforms) {
    for (const pl of allPlatforms as { id: string; name: string }[]) {
      platformNameMap[pl.id] = pl.name
    }
  }
  const postingsMap: Record<string, Property['postings']> = {}
  if (allPostings) {
    for (const pp of allPostings as PropertyPosting[]) {
      if (!postingsMap[pp.property_id]) postingsMap[pp.property_id] = []
      postingsMap[pp.property_id]!.push({
        platform_id: pp.platform_id,
        platform_name: platformNameMap[pp.platform_id] ?? '',
        posted: pp.posted,
        post_url: pp.post_url,
      })
    }
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
      postings: postingsMap[p.id] ?? [],
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
// Public submission goes through app/contact/actions.ts (Server Action with
// rate limit + validation). This module only exposes the admin-side reads.
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
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export async function uploadPropertyImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    throw new Error('ไฟล์ไม่ใช่รูปภาพที่รองรับ (JPEG / PNG / WebP / GIF เท่านั้น)')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 5MB')
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error('นามสกุลไฟล์ไม่รองรับ')
  }
  const sb = getSupabase()
  const path = `properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb.storage.from('property-images').upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`)
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

// Admin-triggered: find Storage objects no longer referenced from any
// properties.images row, and optionally delete them. Used to recover from
// fire-and-forget deletePropertyImage() failures.
export interface OrphanReport {
  orphans: string[]      // paths inside property-images bucket
  deleted: number
}

export async function reconcilePropertyImages(opts: { dryRun: boolean }): Promise<OrphanReport> {
  const sb = getSupabase()

  // 1. Collect every image URL referenced by a property row.
  const { data: props, error } = await sb.from('properties').select('images')
  if (error) throw error
  const referenced = new Set<string>()
  for (const row of (props || []) as { images: string[] }[]) {
    for (const u of row.images || []) {
      const m = u.match(/\/storage\/v1\/object\/public\/property-images\/(.+)$/)
      if (m) referenced.add(m[1])
    }
  }

  // 2. List the bucket. Supabase list() returns max 1000 per call — page through
  // the "properties/" prefix where uploadPropertyImage writes.
  const orphans: string[] = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error: listErr } = await sb.storage
      .from('property-images')
      .list('properties', { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } })
    if (listErr) throw listErr
    if (!data || data.length === 0) break
    for (const obj of data) {
      const fullPath = `properties/${obj.name}`
      if (!referenced.has(fullPath)) orphans.push(fullPath)
    }
    if (data.length < pageSize) break
    offset += pageSize
  }

  // 3. Optionally delete.
  let deleted = 0
  if (!opts.dryRun && orphans.length > 0) {
    // remove() accepts up to 1000 paths per call.
    for (let i = 0; i < orphans.length; i += 1000) {
      const batch = orphans.slice(i, i + 1000)
      const { error: rmErr } = await sb.storage.from('property-images').remove(batch)
      if (rmErr) throw rmErr
      deleted += batch.length
    }
  }

  return { orphans, deleted }
}

// Only send columns that exist in the properties table.
// Used by BOTH create + update so hydrated fields (owner, buildingInfo,
// active_rental) get stripped before the row hits Postgres.
const PROPERTY_COLUMNS = [
  'title', 'title_en', 'description', 'price_monthly', 'property_type',
  'bedrooms', 'bathrooms', 'area_sqm', 'floor', 'building', 'room_number',
  'location', 'district', 'province', 'status', 'rented_until', 'rented_by_us', 'images', 'contact_line', 'owner_id', 'building_id',
] as const

function pickPropertyColumns(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of PROPERTY_COLUMNS) {
    if (col in input && input[col] !== undefined) out[col] = input[col]
  }
  return out
}

// ─── Properties CRUD ─────────────────────────────────────────────────────────
export async function createProperty(
  property: Omit<Property, 'id' | 'created_at' | 'updated_at'>
): Promise<Property> {
  const sb = getSupabase()
  const payload = pickPropertyColumns(property as unknown as Record<string, unknown>)
  const { data, error } = await sb
    .from('properties')
    .insert([payload])
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateProperty(
  id: string,
  property: Partial<Omit<Property, 'id' | 'created_at'>>
): Promise<Property> {
  const sb = getSupabase()
  const payload = {
    ...pickPropertyColumns(property as unknown as Record<string, unknown>),
    updated_at: new Date().toISOString(),
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
  // Use Asia/Bangkok local date so payments due "today TH" are not wrongly culled near UTC midnight.
  const endedDate = todayBangkok()
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
  // Mirror the payments_paid_pair_consistent CHECK so the UI gets a clear
  // error rather than a generic Postgres constraint violation.
  if ('paid_date' in payload || 'paid_amount' in payload) {
    const hasDate = payload.paid_date != null
    const hasAmount = payload.paid_amount != null
    if (hasDate !== hasAmount) {
      throw new Error('ต้องระบุทั้งวันที่จ่ายและจำนวนเงินที่จ่าย หรือเว้นว่างทั้งคู่')
    }
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

// ─── Post Templates ─────────────────────────────────────────────────────────
const POST_TEMPLATE_COLUMNS = ['name', 'is_default', 'sections', 'notes'] as const

function pickPostTemplateColumns(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of POST_TEMPLATE_COLUMNS) {
    if (col in input && input[col] !== undefined) out[col] = input[col]
  }
  return out
}

export async function getPostTemplates(): Promise<PostTemplate[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('post_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPostTemplate(id: string): Promise<PostTemplate | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('post_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPostTemplate(
  input: Omit<PostTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<PostTemplate> {
  const sb = getSupabase()
  const payload = pickPostTemplateColumns(input as unknown as Record<string, unknown>)
  const { data, error } = await sb
    .from('post_templates')
    .insert([payload])
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updatePostTemplate(
  id: string,
  patch: Partial<Omit<PostTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<PostTemplate> {
  const sb = getSupabase()
  const payload = pickPostTemplateColumns(patch as unknown as Record<string, unknown>)
  const { data, error } = await sb
    .from('post_templates')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Template not found')
  return data
}

export async function deletePostTemplate(id: string): Promise<void> {
  const sb = getSupabase()
  // Block delete of default — client guard before DB call.
  const existing = await getPostTemplate(id)
  if (!existing) throw new Error('Template not found')
  if (existing.is_default) throw new Error('ไม่สามารถลบเทมเพลตเริ่มต้นได้ ตั้งเทมเพลตอื่นเป็นค่าเริ่มต้นก่อน')
  const { error } = await sb.from('post_templates').delete().eq('id', id)
  if (error) throw error
}

export async function setDefaultPostTemplate(id: string): Promise<void> {
  const sb = getSupabase()
  // Two-step clear-then-set. Partial unique index is the safety net for races.
  const { error: clearErr } = await sb
    .from('post_templates')
    .update({ is_default: false })
    .eq('is_default', true)
  if (clearErr) throw clearErr
  const { error: setErr } = await sb
    .from('post_templates')
    .update({ is_default: true })
    .eq('id', id)
  if (setErr) throw setErr
}

// ─── Document Templates ─────────────────────────────────────────────────────
const DOCUMENT_BUCKET = 'document-templates'
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const DOCUMENT_MIME: Record<'pdf' | 'docx', string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function validateDocumentFile(file: File, expectedExt: 'pdf' | 'docx'): void {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext !== expectedExt) {
    throw new Error(`ไฟล์ PDF ต้องนามสกุล .pdf / ไฟล์ Word ต้องนามสกุล .docx`)
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 20MB')
  }
}

export async function listDocumentTemplates(category?: DocumentTemplateCategory): Promise<DocumentTemplate[]> {
  const sb = getSupabase()
  let query = sb
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as DocumentTemplate[]
}

export async function uploadDocumentTemplate(params: {
  id?: string
  category: DocumentTemplateCategory
  title: string
  description?: string | null
  pdfFile?: File | null
  docxFile?: File | null
  removePdf?: boolean
  removeDocx?: boolean
}): Promise<DocumentTemplate> {
  const sb = getSupabase()
  const { id: existingId, category, title, description, pdfFile, docxFile, removePdf, removeDocx } = params

  if (pdfFile) validateDocumentFile(pdfFile, 'pdf')
  if (docxFile) validateDocumentFile(docxFile, 'docx')

  if (!existingId) {
    // CREATE: use client-generated UUID so storage paths can be set in the insert
    if (!pdfFile && !docxFile) throw new Error('ต้องเลือกไฟล์ PDF หรือ DOCX อย่างน้อย 1 ไฟล์')

    const newId = crypto.randomUUID()
    const { data: { user } } = await sb.auth.getUser()

    const pdfPath = pdfFile ? `${category}/${newId}.pdf` : null
    const docxPath = docxFile ? `${category}/${newId}.docx` : null

    const { data: row, error: insertErr } = await sb
      .from('document_templates')
      .insert([{
        id: newId,
        category,
        title,
        description: description ?? null,
        pdf_storage_path: pdfPath,
        pdf_file_name: pdfFile?.name ?? null,
        pdf_size_bytes: pdfFile?.size ?? null,
        docx_storage_path: docxPath,
        docx_file_name: docxFile?.name ?? null,
        docx_size_bytes: docxFile?.size ?? null,
        uploaded_by: user?.id ?? null,
      }])
      .select()
      .maybeSingle()
    if (insertErr) throw insertErr
    if (!row) throw new Error('Insert returned no data')

    const uploaded: string[] = []
    try {
      if (pdfFile && pdfPath) {
        const { error: upErr } = await sb.storage
          .from(DOCUMENT_BUCKET)
          .upload(pdfPath, pdfFile, { upsert: false, contentType: DOCUMENT_MIME.pdf })
        if (upErr) throw new Error(`อัปโหลด PDF ไม่สำเร็จ: ${upErr.message}`)
        uploaded.push(pdfPath)
      }
      if (docxFile && docxPath) {
        const { error: upErr } = await sb.storage
          .from(DOCUMENT_BUCKET)
          .upload(docxPath, docxFile, { upsert: false, contentType: DOCUMENT_MIME.docx })
        if (upErr) throw new Error(`อัปโหลด DOCX ไม่สำเร็จ: ${upErr.message}`)
        uploaded.push(docxPath)
      }
    } catch (uploadErr) {
      // Roll back: delete row and any already-uploaded objects
      await sb.from('document_templates').delete().eq('id', newId)
      if (uploaded.length) await sb.storage.from(DOCUMENT_BUCKET).remove(uploaded)
      throw uploadErr
    }

    return row as DocumentTemplate
  } else {
    // EDIT: fetch existing row first
    const { data: existing, error: fetchErr } = await sb
      .from('document_templates')
      .select('*')
      .eq('id', existingId)
      .maybeSingle()
    if (fetchErr || !existing) throw new Error('ไม่พบเอกสาร')

    const patch: Record<string, unknown> = { category, title, description: description ?? null }

    // Determine whether at least one variant will remain after changes
    const pdfWillExist = !removePdf && (pdfFile ? true : !!existing.pdf_storage_path)
    const docxWillExist = !removeDocx && (docxFile ? true : !!existing.docx_storage_path)
    if (!pdfWillExist && !docxWillExist) {
      throw new Error('ต้องมีไฟล์อย่างน้อย 1 รูปแบบ (PDF หรือ DOCX)')
    }

    // PDF variant
    if (removePdf) {
      if (existing.pdf_storage_path) {
        const { error: rmErr } = await sb.storage.from(DOCUMENT_BUCKET).remove([existing.pdf_storage_path])
        if (rmErr) console.warn('Storage delete PDF failed:', rmErr.message)
      }
      patch.pdf_storage_path = null
      patch.pdf_file_name = null
      patch.pdf_size_bytes = null
    } else if (pdfFile) {
      const newPath = `${category}/${existingId}.pdf`
      // If category changed, the old path has a different prefix — remove it
      if (existing.pdf_storage_path && existing.pdf_storage_path !== newPath) {
        const { error: rmErr } = await sb.storage.from(DOCUMENT_BUCKET).remove([existing.pdf_storage_path])
        if (rmErr) console.warn('Storage delete old PDF failed:', rmErr.message)
      }
      const { error: upErr } = await sb.storage
        .from(DOCUMENT_BUCKET)
        .upload(newPath, pdfFile, { upsert: true, contentType: DOCUMENT_MIME.pdf })
      if (upErr) throw new Error(`อัปโหลด PDF ไม่สำเร็จ: ${upErr.message}`)
      patch.pdf_storage_path = newPath
      patch.pdf_file_name = pdfFile.name
      patch.pdf_size_bytes = pdfFile.size
    }

    // DOCX variant
    if (removeDocx) {
      if (existing.docx_storage_path) {
        const { error: rmErr } = await sb.storage.from(DOCUMENT_BUCKET).remove([existing.docx_storage_path])
        if (rmErr) console.warn('Storage delete DOCX failed:', rmErr.message)
      }
      patch.docx_storage_path = null
      patch.docx_file_name = null
      patch.docx_size_bytes = null
    } else if (docxFile) {
      const newPath = `${category}/${existingId}.docx`
      if (existing.docx_storage_path && existing.docx_storage_path !== newPath) {
        const { error: rmErr } = await sb.storage.from(DOCUMENT_BUCKET).remove([existing.docx_storage_path])
        if (rmErr) console.warn('Storage delete old DOCX failed:', rmErr.message)
      }
      const { error: upErr } = await sb.storage
        .from(DOCUMENT_BUCKET)
        .upload(newPath, docxFile, { upsert: true, contentType: DOCUMENT_MIME.docx })
      if (upErr) throw new Error(`อัปโหลด DOCX ไม่สำเร็จ: ${upErr.message}`)
      patch.docx_storage_path = newPath
      patch.docx_file_name = docxFile.name
      patch.docx_size_bytes = docxFile.size
    }

    const { data: updated, error: updateErr } = await sb
      .from('document_templates')
      .update(patch)
      .eq('id', existingId)
      .select()
      .maybeSingle()
    if (updateErr) throw updateErr
    if (!updated) throw new Error('Update returned no data')
    return updated as DocumentTemplate
  }
}

export async function updateDocumentTemplateMeta(
  id: string,
  patch: { title?: string; description?: string | null; category?: DocumentTemplateCategory }
): Promise<DocumentTemplate> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('document_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Document not found')
  return data as DocumentTemplate
}

export async function deleteDocumentTemplate(id: string): Promise<void> {
  const sb = getSupabase()
  const { data: row } = await sb
    .from('document_templates')
    .select('pdf_storage_path, docx_storage_path')
    .eq('id', id)
    .maybeSingle()
  const pathsToRemove = [row?.pdf_storage_path, row?.docx_storage_path].filter(Boolean) as string[]
  if (pathsToRemove.length) {
    const { error: rmErr } = await sb.storage.from(DOCUMENT_BUCKET).remove(pathsToRemove)
    if (rmErr) console.warn('Storage delete failed:', rmErr.message)
  }
  const { error } = await sb.from('document_templates').delete().eq('id', id)
  if (error) throw error
}

// ─── Rental Documents ────────────────────────────────────────────────────────
const RENTAL_DOC_BUCKET = 'rental-documents'
const RENTAL_DOC_MAX_BYTES = 20 * 1024 * 1024
const RENTAL_DOC_ALLOWED_EXTS = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'webp']

const RENTAL_DOC_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function listRentalDocuments(rentalId: string): Promise<RentalDocument[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('rental_documents')
    .select('*')
    .eq('rental_id', rentalId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as RentalDocument[]
}

export async function uploadRentalDocument(rentalId: string, file: File): Promise<RentalDocument> {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!RENTAL_DOC_ALLOWED_EXTS.includes(ext)) {
    throw new Error('ไฟล์ไม่รองรับ — รองรับเฉพาะ PDF, DOCX, JPG, PNG, WEBP')
  }
  if (file.size > RENTAL_DOC_MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 20MB')
  }
  const mimeType = RENTAL_DOC_MIME[ext] ?? 'application/octet-stream'
  const sb = getSupabase()
  const docId = crypto.randomUUID()
  const storagePath = `${rentalId}/${docId}.${ext}`
  const { error: upErr } = await sb.storage
    .from(RENTAL_DOC_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: mimeType })
  if (upErr) throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${upErr.message}`)
  const { data: { user } } = await sb.auth.getUser()
  const { data, error: insertErr } = await sb
    .from('rental_documents')
    .insert([{
      id: docId,
      rental_id: rentalId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size_bytes: file.size,
      uploaded_by: user?.id ?? null,
    }])
    .select()
    .maybeSingle()
  if (insertErr) {
    await sb.storage.from(RENTAL_DOC_BUCKET).remove([storagePath]).catch(() => {})
    throw insertErr
  }
  if (!data) throw new Error('Insert returned no data')
  return data as RentalDocument
}

export async function deleteRentalDocument(id: string): Promise<void> {
  const sb = getSupabase()
  const { data: row } = await sb
    .from('rental_documents')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (row?.storage_path) {
    const { error: rmErr } = await sb.storage.from(RENTAL_DOC_BUCKET).remove([row.storage_path])
    if (rmErr) console.warn('Storage delete failed:', rmErr.message)
  }
  const { error } = await sb.from('rental_documents').delete().eq('id', id)
  if (error) throw error
}

// ─── Posting Platforms ──────────────────────────────────────────────────────
export async function listPostingPlatforms(opts?: { activeOnly?: boolean }): Promise<PostingPlatform[]> {
  const sb = getSupabase()
  let query = sb.from('posting_platforms').select('*').order('sort_order', { ascending: true })
  if (opts?.activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as PostingPlatform[]
}

export async function createPostingPlatform(name: string): Promise<PostingPlatform> {
  const sb = getSupabase()
  const { data: maxRow } = await sb
    .from('posting_platforms')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 10
  const { data, error } = await sb
    .from('posting_platforms')
    .insert([{ name, sort_order: nextOrder, active: true }])
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data as PostingPlatform
}

export async function updatePostingPlatform(
  id: string,
  patch: { name?: string; sort_order?: number; active?: boolean }
): Promise<PostingPlatform> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('posting_platforms')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Platform not found')
  return data as PostingPlatform
}

export async function deletePostingPlatform(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('posting_platforms').delete().eq('id', id)
  if (error) throw error
}

// ─── Property Postings ──────────────────────────────────────────────────────
export async function listPropertyPostings(propertyId: string): Promise<PropertyPosting[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('property_postings')
    .select('*')
    .eq('property_id', propertyId)
  if (error) throw error
  return (data || []) as PropertyPosting[]
}

export async function upsertPropertyPostings(
  propertyId: string,
  items: Array<{ platform_id: string; posted: boolean; post_url: string | null }>
): Promise<PropertyPosting[]> {
  const sb = getSupabase()
  if (items.length === 0) return []
  const rows = items.map(item => ({
    property_id: propertyId,
    platform_id: item.platform_id,
    posted: item.posted,
    post_url: item.post_url || null,
  }))
  const { data, error } = await sb
    .from('property_postings')
    .upsert(rows, { onConflict: 'property_id,platform_id' })
    .select()
  if (error) throw error
  return (data || []) as PropertyPosting[]
}
