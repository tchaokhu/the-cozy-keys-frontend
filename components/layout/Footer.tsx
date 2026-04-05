import Link from 'next/link'
import { Phone, MessageCircle, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--text-dark)' }} className="text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 pb-12"
          style={{ borderBottom: '1px solid rgba(245,240,232,0.1)' }}>

          {/* Brand */}
          <div>
            <div className="font-serif text-2xl font-bold mb-3" style={{ color: 'var(--cream)' }}>
              The Cozy{' '}
              <em style={{ color: 'var(--terracotta-light)', fontStyle: 'italic' }}>Keys</em>
            </div>
            <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'rgba(245,240,232,0.5)' }}>
              ที่ปรึกษาอสังหาริมทรัพย์ให้เช่า<br />
              ศรีราชา · แหลมฉบัง · ชลบุรี
            </p>
            <div className="flex gap-3">
              <a
                href="@thecozykeys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  background: 'rgba(196,98,45,0.2)',
                  color: 'var(--terracotta-light)',
                  border: '1px solid rgba(196,98,45,0.3)',
                }}
              >
                <MessageCircle size={14} /> LINE OA
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <div className="text-xs uppercase tracking-widest mb-5" style={{ color: 'rgba(245,240,232,0.35)' }}>
              บริการ
            </div>
            {[
              { href: '/listings', label: 'ทรัพย์ให้เช่าทั้งหมด' },
              { href: '/listings?type=condo', label: 'คอนโดให้เช่า' },
              { href: '/listings?type=house', label: 'บ้านให้เช่า' },
              { href: '/listings?type=townhome', label: 'ทาวน์โฮมให้เช่า' },
              { href: '/contact', label: 'ติดต่อ / นัดชม' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="block text-sm mb-3 transition-colors duration-200"
                style={{ color: 'rgba(245,240,232,0.55)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta-light)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.55)')}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs uppercase tracking-widest mb-5" style={{ color: 'rgba(245,240,232,0.35)' }}>
              ติดต่อเรา
            </div>
            <div className="flex flex-col gap-3">
              <a href="tel:0876706436" className="flex items-center gap-3 text-sm"
                style={{ color: 'rgba(245,240,232,0.6)' }}>
                <Phone size={14} style={{ color: 'var(--terracotta-light)' }} />
                K. Nut 087 670 6436
              </a>
              <a href="tel:0980915461" className="flex items-center gap-3 text-sm"
                style={{ color: 'rgba(245,240,232,0.6)' }}>
                <Phone size={14} style={{ color: 'var(--terracotta-light)' }} />
                K. Dear 098 091 5461
              </a>
              <a href="@thecozykeys" className="flex items-center gap-3 text-sm"
                style={{ color: 'rgba(245,240,232,0.6)' }}>
                <MessageCircle size={14} style={{ color: 'var(--terracotta-light)' }} />
                LINE: The Cozy Keys
              </a>
              <div className="flex items-start gap-3 text-sm"
                style={{ color: 'rgba(245,240,232,0.6)' }}>
                <MapPin size={14} style={{ color: 'var(--terracotta-light)', marginTop: 2, flexShrink: 0 }} />
                ให้บริการในศรีราชา แหลมฉบัง และพื้นที่ใกล้เคียงในชลบุรี
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs"
          style={{ color: 'rgba(245,240,232,0.3)' }}>
          <span>© 2025 The Cozy Keys. สงวนลิขสิทธิ์.</span>
          <span>ศรีราชา · แหลมฉบัง · ชลบุรี</span>
        </div>
      </div>
    </footer>
  )
}
