export type PropertyType = 'condo' | 'house' | 'townhome'
export type PropertyStatus = 'available' | 'reserved' | 'rented'

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
  location: string
  district: string
  province: string
  status: PropertyStatus
  images: string[]
  amenities: string[]
  contact_line?: string
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

export interface FilterState {
  district: string
  property_type: string
  min_price: number
  max_price: number
  bedrooms: string
}
