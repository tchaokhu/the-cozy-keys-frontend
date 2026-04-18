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
  rented_until?: string
  rented_by_us?: boolean
  images: string[]
  contact_line?: string
  owner_id?: string
  owner?: Owner
  building_id?: string
  buildingInfo?: Building
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
