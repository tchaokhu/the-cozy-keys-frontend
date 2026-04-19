export type PropertyType = 'condo' | 'house' | 'townhome'
export type PropertyStatus = 'available' | 'reserved' | 'rented'

export interface Building {
  id: string
  name: string
  name_en?: string
  district: string
  province: string
  google_map_url?: string
  facilities: string[]
  nearby: string[]
  created_at: string
}

export interface Owner {
  id: string
  name: string
  phone: string
  email?: string
  line_id?: string
  note?: string
  source?: string
  created_at: string
}

export interface Property {
  id: string
  title: string
  title_en?: string
  description?: string
  price_monthly: number
  property_type: PropertyType
  bedrooms: number
  bathrooms: number
  area_sqm: number
  floor?: number
  building?: string
  room_number?: string
  location: string
  district: string
  province: string
  status: PropertyStatus
  /** @deprecated use active_rental.end_date — kept for DB backward compat only */
  rented_until?: string
  /** @deprecated use active_rental.rented_by_us — kept for DB backward compat only */
  rented_by_us?: boolean
  images: string[]
  contact_line?: string
  owner_id?: string
  owner?: Owner
  building_id?: string
  buildingInfo?: Building
  active_rental?: Rental
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  name: string
  phone?: string
  email?: string
  line_id?: string
  id_card?: string
  address?: string
  emergency_contact?: string
  note?: string
  created_at: string
  updated_at: string
  active_rental_count?: number
}

export type RentalStatus = 'active' | 'ended' | 'cancelled'

export interface Rental {
  id: string
  property_id: string
  tenant_id?: string
  tenant?: Tenant
  tenant_name_snapshot: string
  tenant_phone_snapshot?: string
  start_date: string
  end_date: string
  monthly_rent: number
  deposit: number
  commission: number
  rented_by_us: boolean
  status: RentalStatus
  ended_at?: string
  ended_reason?: string
  note?: string
  property?: Property
  created_at: string
  updated_at: string
}

export type PaymentType = 'rent' | 'deposit' | 'commission' | 'other'
export type PaymentMethod = 'cash' | 'transfer' | 'other'
export type PaymentStatus = 'paid' | 'partial' | 'overdue' | 'pending'

export interface Payment {
  id: string
  rental_id: string
  property_id: string
  type: PaymentType
  due_date: string
  amount: number
  paid_date?: string
  paid_amount?: number
  method?: PaymentMethod
  note?: string
  rental?: Rental
  property?: Property
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  property_id: string
  property?: Property
  name: string
  phone: string
  email?: string
  message?: string
  preferred_date?: string
  status: 'new' | 'contacted' | 'closed'
  created_at: string
}

export interface ScheduledPost {
  id: string
  property_id: string
  property?: Property
  post_content_th: string
  post_content_en: string
  scheduled_date: string
  scheduled_time: string
  images: string[]
  status: 'planned' | 'scheduled' | 'published' | 'failed' | 'fb_scheduled' | 'fb_published'
  fb_post_id?: string
  created_at: string
}

export interface FilterState {
  district: string
  property_type: string
  min_price: number
  max_price: number
  bedrooms: string
}
