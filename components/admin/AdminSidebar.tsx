'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Home, Bell, Share2, Eye, Users } from 'lucide-react'

const NAV = [
  { icon: <BarChart2 size={18} />, label: 'ภาพรวม', href: '/admin/dashboard' },
  { icon: <Home size={18} />, label: 'ทรัพย์ทั้งหมด', href: '/admin/properties' },
  { icon: <Bell size={18} />, label: 'การติดต่อ', href: '/admin/inquiries' },
  { icon: <Users size={18} />, label: 'จัดการเจ้าของ', href: '/admin/owners' },
  { icon: <Share2 size={18} />, label: 'โพสต์ Facebook', href: '/admin/facebook-post' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  // Match active: exact for dashboard/facebook-post, prefix for properties/inquiries
  const isActive = (href: string) =>
    ['/admin/properties', '/admin/owners'].includes(href)
      ? pathname.startsWith(href)
      : pathname === href

  return (
    <aside
      className="w-64 shrink-0 border-r flex flex-col"
      style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', minHeight: '100vh' }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
        <div className="font-serif text-lg font-bold" style={{ color: 'var(--brown)' }}>
          The Cozy <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>Keys</em>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>Admin Panel</div>
      </div>

      <nav className="p-4 flex flex-col gap-1 flex-1">
        {NAV.map(({ icon, label, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                color: active ? 'var(--terracotta)' : 'var(--text-mid)',
                background: active ? 'rgba(196,98,45,0.08)' : 'transparent',
              }}
            >
              {icon} {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-center w-full transition-all"
          style={{ background: 'var(--terracotta)', color: 'white' }}
        >
          <Eye size={16} /> ดูหน้าเว็บ
        </Link>
      </div>
    </aside>
  )
}
