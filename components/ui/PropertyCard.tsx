import Link from 'next/link'
import { MapPin, BedDouble, Bath, Square } from 'lucide-react'
import type { Property } from '@/types'

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'ว่าง', color: '#0F6E56', bg: 'rgba(135,168,120,0.18)' },
  reserved: { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.18)' },
  rented: { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.18)' },
}

const TYPE_LABEL: Record<string, string> = {
  condo: 'คอนโด',
  house: 'บ้านเดี่ยว',
  townhome: 'ทาวน์โฮม',
}

const PLACEHOLDER_COLORS: Record<string, string> = {
  condo: 'linear-gradient(135deg, #D4C4A8, #C4A882)',
  house: 'linear-gradient(135deg, #C8D4B8, #A8C498)',
  townhome: 'linear-gradient(135deg, #D4BCA8, #C49878)',
}

export default function PropertyCard({ property }: { property: Property }) {
  const status = STATUS_LABEL[property.status]

  return (
    <Link href={`/listings/${property.id}`} className="block group">
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300 border"
        style={{
          background: 'white',
          borderColor: 'rgba(196,98,45,0.08)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-8px)'
          el.style.boxShadow = '0 24px 56px rgba(44,24,16,0.12)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'none'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Image */}
        <div
          className="relative h-52 flex items-center justify-center"
          style={{
            background: PLACEHOLDER_COLORS[property.property_type] || PLACEHOLDER_COLORS.condo,
          }}
        >
          {property.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl opacity-40">
              {property.property_type === 'condo' ? '🏢' : property.property_type === 'house' ? '🏠' : '🏘️'}
            </span>
          )}

          {/* Status badge */}
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </div>

          {/* Type badge */}
          <div
            className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(245,240,232,0.9)', color: 'var(--text-mid)' }}
          >
            {TYPE_LABEL[property.property_type]}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <h3
            className="font-serif text-lg font-semibold mb-1 leading-tight"
            style={{ color: 'var(--brown)' }}
          >
            {property.title}
          </h3>

          <div className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--text-light)' }}>
            <MapPin size={11} />
            {property.district}, {property.province}
          </div>

          {/* Features */}
          <div
            className="flex gap-4 mb-4 pb-4 text-xs"
            style={{
              color: 'var(--text-mid)',
              borderBottom: '1px solid rgba(107,68,35,0.1)',
            }}
          >
            <span className="flex items-center gap-1">
              <BedDouble size={12} /> {property.bedrooms} ห้องนอน
            </span>
            <span className="flex items-center gap-1">
              <Bath size={12} /> {property.bathrooms} ห้องน้ำ
            </span>
            <span className="flex items-center gap-1">
              <Square size={12} /> {property.area_sqm} ตร.ม.
            </span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between">
            <div>
              <span
                className="font-serif text-xl font-bold"
                style={{ color: 'var(--terracotta)' }}
              >
                ฿{property.price_monthly.toLocaleString()}
              </span>
              <span className="text-xs ml-1" style={{ color: 'var(--text-light)' }}>
                /เดือน
              </span>
            </div>
            <div
              className="text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 group-hover:text-white"
              style={{
                background: 'var(--cream-dark)',
                color: 'var(--brown)',
              }}
            >
              ดูรายละเอียด →
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
