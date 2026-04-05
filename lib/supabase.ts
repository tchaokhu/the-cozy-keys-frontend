import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Property, Inquiry, Owner } from '@/types'

// Lazy init — ไม่ crash ถ้ายังไม่มี .env.local
let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

const useMock = () => !process.env.NEXT_PUBLIC_SUPABASE_URL

// ─── Mock data ────────────────────────────────────────────────────────────────
export const MOCK_OWNERS: Owner[] = [
  {
    id: 'owner-1',
    name: 'สมศักดิ์ วงศ์ทอง',
    phone: '081-234-5678',
    email: 'somsak@email.com',
    line_id: '@somsak',
    created_at: new Date().toISOString(),
  },
  {
    id: 'owner-2',
    name: 'นิตยา พรรณราย',
    phone: '089-876-5432',
    created_at: new Date().toISOString(),
  },
]

export const MOCK_PROPERTIES: Property[] = [];

export const MOCK_INQUIRIES: Inquiry[] = []

// ─── API helpers ─────────────────────────────────────────────────────────────
export async function getProperties(filters?: Partial<{
  district: string
  property_type: string
  min_price: number
  max_price: number
  bedrooms: number
  status: string
}>): Promise<Property[]> {
  console.log('USE_MOCK:', useMock())
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (useMock()) {
    let data = [...MOCK_PROPERTIES]
    if (filters?.district) data = data.filter(p => p.district === filters.district)
    if (filters?.property_type) data = data.filter(p => p.property_type === filters.property_type)
    if (filters?.min_price) data = data.filter(p => p.price_monthly >= filters.min_price!)
    if (filters?.max_price) data = data.filter(p => p.price_monthly <= filters.max_price!)
    if (filters?.bedrooms) data = data.filter(p => p.bedrooms === filters.bedrooms)
    if (filters?.status) data = data.filter(p => p.status === filters.status)
    return data
  }

  const sb = getSupabase()!
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

  // Manual join: fetch owners for properties that have owner_id
  const ownerIds = Array.from(new Set(props.map((p: Property) => p.owner_id).filter(Boolean))) as string[]
  let ownersMap: Record<string, Owner> = {}
  if (ownerIds.length > 0) {
    const { data: owners } = await sb.from('owners').select('*').in('id', ownerIds)
    if (owners) {
      ownersMap = Object.fromEntries(owners.map((o: Owner) => [o.id, o]))
    }
  }

  return props.map((p: Property) => ({
    ...p,
    owner: p.owner_id ? ownersMap[p.owner_id] : undefined,
  }))
}

export async function getPropertyById(id: string): Promise<Property | null> {
  if (useMock()) return MOCK_PROPERTIES.find(p => p.id === id) || null
  const sb = getSupabase()!
  const { data, error } = await sb.from('properties').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

export async function createInquiry(inquiry: Omit<Inquiry, 'id' | 'status' | 'created_at'>): Promise<void> {
  if (useMock()) {
    console.log('Mock: inquiry submitted', inquiry)
    return
  }
  const sb = getSupabase()!
  const { error } = await sb.from('inquiries').insert([{ ...inquiry, status: 'new' }])
  if (error) throw error
}

export async function getInquiries(): Promise<Inquiry[]> {
  if (useMock()) return MOCK_INQUIRIES
  const sb = getSupabase()!
  const { data, error } = await sb
    .from('inquiries')
    .select('*, property:properties(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

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
  if (!sb) return fileToDataUrl(file)

  const ext = file.name.split('.').pop()
  const path = `properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb.storage.from('property-images').upload(path, file, { upsert: false })
  if (error) {
    // bucket ไม่ได้ตั้งค่า — fallback เป็น data URL
    console.warn('Storage upload failed, falling back to data URL:', error.message)
    return fileToDataUrl(file)
  }
  const { data } = sb.storage.from('property-images').getPublicUrl(path)
  return data.publicUrl
}

export async function createProperty(
  property: Omit<Property, 'id' | 'created_at' | 'updated_at'>
): Promise<Property> {
  if (useMock()) {
    const newProp: Property = {
      ...property,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    MOCK_PROPERTIES.unshift(newProp)
    return newProp
  }
  const sb = getSupabase()!
  const { data, error } = await sb
    .from('properties')
    .insert([property])
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
  if (useMock()) {
    const idx = MOCK_PROPERTIES.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Property not found')
    MOCK_PROPERTIES[idx] = {
      ...MOCK_PROPERTIES[idx],
      ...property,
      updated_at: new Date().toISOString(),
    }
    return MOCK_PROPERTIES[idx]
  }
  const sb = getSupabase()!
  const { data, error } = await sb
    .from('properties')
    .update({ ...property, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Property not found')
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) {
    const idx = MOCK_PROPERTIES.findIndex(p => p.id === id)
    if (idx !== -1) MOCK_PROPERTIES.splice(idx, 1)
    return
  }
  const { error } = await sb.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ─── Owner helpers ────────────────────────────────────────────────────────────
export async function getOwners(): Promise<Owner[]> {
  if (useMock()) return [...MOCK_OWNERS]
  const sb = getSupabase()!
  const { data, error } = await sb.from('owners').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function createOwner(
  owner: Omit<Owner, 'id' | 'created_at'>
): Promise<Owner> {
  if (useMock()) {
    const newOwner: Owner = {
      ...owner,
      id: 'owner-' + Date.now(),
      created_at: new Date().toISOString(),
    }
    MOCK_OWNERS.unshift(newOwner)
    return newOwner
  }
  const sb = getSupabase()!
  const { data, error } = await sb.from('owners').insert([owner]).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Insert returned no data')
  return data
}

export async function updateOwner(
  id: string,
  owner: Partial<Omit<Owner, 'id' | 'created_at'>>
): Promise<Owner> {
  if (useMock()) {
    const idx = MOCK_OWNERS.findIndex(o => o.id === id)
    if (idx === -1) throw new Error('Owner not found')
    MOCK_OWNERS[idx] = { ...MOCK_OWNERS[idx], ...owner }
    return MOCK_OWNERS[idx]
  }
  const sb = getSupabase()!
  const { data, error } = await sb.from('owners').update(owner).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Owner not found')
  return data
}

export async function deleteOwner(id: string): Promise<void> {
  if (useMock()) {
    const idx = MOCK_OWNERS.findIndex(o => o.id === id)
    if (idx !== -1) MOCK_OWNERS.splice(idx, 1)
    return
  }
  const sb = getSupabase()!
  const { error } = await sb.from('owners').delete().eq('id', id)
  if (error) throw error
}