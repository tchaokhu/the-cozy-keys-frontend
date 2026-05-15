'use client'
import { useState } from 'react'
import { MapPin, BedDouble, Bath, Square, ChevronLeft, ChevronRight, Dumbbell, TreePine, ExternalLink } from 'lucide-react'
import { safeHttpUrl } from '@/lib/validate'
import type { Building, PropertyStatus, PropertyType } from '@/types'

const STATUS_INFO: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  available: { label: 'ว่างพร้อมเข้าอยู่', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  reserved: { label: 'จองแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  rented: { label: 'เช่าแล้ว', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
}

const TYPE_GRADIENT: Record<PropertyType, string> = {
  condo: 'linear-gradient(135deg,#D4C4A8,#C4A882)',
  house: 'linear-gradient(135deg,#C8D4B8,#A8C498)',
  townhome: 'linear-gradient(135deg,#D4BCA8,#C49878)',
}

const TYPE_EMOJI: Record<PropertyType, string> = {
  condo: '🏢',
  house: '🏠',
  townhome: '🏘️',
}

export interface PropertyPreviewForm {
  title: string
  title_en: string
  description: string
  price_monthly: string
  property_type: PropertyType
  bedrooms: string
  bathrooms: string
  area_sqm: string
  floor: string
  building: string
  room_number: string
  location: string
  district: string
  province: string
  status: PropertyStatus
  images: string[]
}

export default function PropertyPreview({
  form,
  building,
}: {
  form: PropertyPreviewForm
  building: Building | null
}) {
  const [activeImg, setActiveImg] = useState(0)

  const isEmpty = !form.title && form.images.length === 0

  const locationParts = [
    form.location || form.district,
    form.province,
  ].filter(Boolean).join(', ')

  const mapUrl = safeHttpUrl(building?.google_map_url)
  const status = STATUS_INFO[form.status]

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
        style={{ color: 'var(--text-light)' }}>
        ตัวอย่างหน้าเว็บ
      </p>

      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.12)' }}>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <span className="text-5xl mb-3 opacity-20">🏠</span>
            <p className="text-sm font-light" style={{ color: 'var(--text-light)' }}>
              เริ่มกรอกข้อมูล<br />ตัวอย่างจะแสดงที่นี่
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Image gallery */}
            <div>
              <div
                className="relative w-full rounded-xl overflow-hidden flex items-center justify-center group"
                style={{
                  aspectRatio: '16/10',
                  background: TYPE_GRADIENT[form.property_type],
                }}
              >
                {form.images[activeImg]
                  ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.images[activeImg]}
                      alt={form.title}
                      className="w-full h-full object-cover"
                    />
                  )
                  : (
                    <span className="text-5xl opacity-25">
                      {TYPE_EMOJI[form.property_type]}
                    </span>
                  )
                }

                {form.images.length > 1 && activeImg > 0 && (
                  <button type="button"
                    onClick={() => setActiveImg(i => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
                    style={{ color: 'var(--text-dark)' }}>
                    <ChevronLeft size={16} />
                  </button>
                )}
                {form.images.length > 1 && activeImg < form.images.length - 1 && (
                  <button type="button"
                    onClick={() => setActiveImg(i => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
                    style={{ color: 'var(--text-dark)' }}>
                    <ChevronRight size={16} />
                  </button>
                )}

                {form.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white">
                    {activeImg + 1} / {form.images.length}
                  </span>
                )}
              </div>

              {form.images.length > 1 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {form.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className="shrink-0 rounded-lg overflow-hidden transition-all"
                      style={{
                        width: 60,
                        height: 42,
                        outline: activeImg === i ? '2px solid var(--terracotta)' : '2px solid transparent',
                        outlineOffset: 1,
                        opacity: activeImg === i ? 1 : 0.6,
                        background: 'var(--cream-dark)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status badge */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span
                  className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium mb-2"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>

                {/* Title */}
                {form.title && (
                  <h3 className="font-serif text-lg font-bold leading-snug"
                    style={{ color: 'var(--brown)' }}>
                    {form.title}
                  </h3>
                )}
                {form.title_en && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>
                    {form.title_en}
                  </p>
                )}

                {/* Location */}
                {locationParts && (
                  <div className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'var(--text-light)' }}>
                    <MapPin size={11} />
                    <span>{locationParts}</span>
                    {mapUrl && (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 ml-1 hover:opacity-80"
                        style={{ color: 'var(--terracotta)' }}>
                        แผนที่ <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <div className="font-serif text-xl font-bold" style={{ color: 'var(--terracotta)' }}>
                  ฿{Number(form.price_monthly || 0).toLocaleString()}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-light)' }}>/เดือน</div>
              </div>
            </div>

            {/* Key specs */}
            <div
              className="grid grid-cols-3 gap-2 p-3 rounded-xl"
              style={{ background: 'var(--cream-dark)' }}
            >
              {[
                { icon: <BedDouble size={14} />, val: `${form.bedrooms || '—'} ห้องนอน`, label: 'ห้องนอน' },
                { icon: <Bath size={14} />, val: `${form.bathrooms || '—'} ห้องน้ำ`, label: 'ห้องน้ำ' },
                { icon: <Square size={14} />, val: form.area_sqm ? `${form.area_sqm} ตร.ม.` : '— ตร.ม.', label: 'พื้นที่' },
              ].map(({ icon, val, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 text-center">
                  <div style={{ color: 'var(--terracotta)' }}>{icon}</div>
                  <div className="font-serif font-semibold text-xs" style={{ color: 'var(--brown)' }}>{val}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-light)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {form.description && (
              <div>
                <h4 className="font-serif text-sm font-semibold mb-1.5" style={{ color: 'var(--brown)' }}>
                  รายละเอียด
                </h4>
                <p className="text-xs font-light leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text-mid)' }}>
                  {form.description}
                </p>
              </div>
            )}

            {/* Facilities */}
            {building?.facilities && building.facilities.length > 0 && (
              <div>
                <h4 className="font-serif text-sm font-semibold mb-2 flex items-center gap-1.5"
                  style={{ color: 'var(--brown)' }}>
                  <Dumbbell size={13} style={{ color: 'var(--terracotta)' }} />
                  สิ่งอำนวยความสะดวก
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {building.facilities.map((item, i) => (
                    <span key={i}
                      className="px-3 py-1 rounded-full text-[11px] font-light"
                      style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby */}
            {building?.nearby && building.nearby.length > 0 && (
              <div>
                <h4 className="font-serif text-sm font-semibold mb-2 flex items-center gap-1.5"
                  style={{ color: 'var(--brown)' }}>
                  <TreePine size={13} style={{ color: 'var(--terracotta)' }} />
                  สถานที่ใกล้เคียง
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {building.nearby.map((item, i) => (
                    <span key={i}
                      className="px-3 py-1 rounded-full text-[11px] font-light"
                      style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
