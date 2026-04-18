import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Property, Inquiry, Owner, Building, ScheduledPost } from '@/types'

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

  // Manual join: fetch owners and buildings
  const ownerIds = Array.from(new Set(props.map((p: Property) => p.owner_id).filter(Boolean))) as string[]
  let ownersMap: Record<string, Owner> = {}
  if (ownerIds.length > 0) {
    const { data: owners } = await sb.from('owners').select('*').in('id', ownerIds)
    if (owners) {
      ownersMap = Object.fromEntries(owners.map((o: Owner) => [o.id, o]))
    }
  }

  const buildingIds = Array.from(new Set(props.map((p: Property) => p.building_id).filter(Boolean))) as string[]
  let buildingsMap: Record<string, Building> = {}
  if (buildingIds.length > 0) {
    const { data: buildings } = await sb.from('buildings').select('*').in('id', buildingIds)
    if (buildings) {
      buildingsMap = Object.fromEntries(buildings.map((b: Building) => [b.id, b]))
    }
  }

  return props.map((p: Property) => ({
    ...p,
    owner: p.owner_id ? ownersMap[p.owner_id] : undefined,
    buildingInfo: p.building_id ? buildingsMap[p.building_id] : undefined,
  }))
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('properties').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null

  if (data.building_id) {
    const { data: bld } = await sb.from('buildings').select('*').eq('id', data.building_id).maybeSingle()
    if (bld) data.buildingInfo = bld
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

