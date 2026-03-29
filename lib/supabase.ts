import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Property, Inquiry } from '@/types'

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
export const MOCK_PROPERTIES: Property[] = [];

export const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: '1',
    property_id: '1',
    name: 'สมชาย ใจดี',
    phone: '081-234-5678',
    email: 'somchai@email.com',
    message: 'สนใจห้องนี้มาก อยากนัดชมวันเสาร์นี้ได้ไหมครับ',
    preferred_date: '2025-08-02',
    status: 'new',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    property_id: '2',
    name: 'นงนุช สวยงาม',
    phone: '089-876-5432',
    message: 'ราคาต่อรองได้ไหมคะ มีเด็กเล็ก 1 คน',
    status: 'contacted',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    property_id: '5',
    name: 'Tanaka Hiroshi',
    phone: '085-111-2233',
    email: 'tanaka@company.jp',
    message: 'Looking for long-term rental, 1 year contract preferred',
    preferred_date: '2025-08-05',
    status: 'new',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

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

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPropertyById(id: string): Promise<Property | null> {
  if (useMock()) return MOCK_PROPERTIES.find(p => p.id === id) || null
  const sb = getSupabase()!
  const { data, error } = await sb.from('properties').select('*').eq('id', id).single()
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