'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, Home, Bell, Share2, Eye, Users, Menu, X, LogOut, Calendar, Building2, KeyRound, FileText, Wallet } from 'lucide-react'
import { signOut } from '@/lib/supabase'

const NAV = [
  { icon: <BarChart2 size={18} />, label: 'ภาพรวม', href: '/admin/dashboard' },
  { icon: <Home size={18} />, label: 'ทรัพย์ทั้งหมด', href: '/admin/properties' },
  { icon: <FileText size={18} />, label: 'สัญญาเช่า', href: '/admin/rentals' },
  { icon: <KeyRound size={18} />, label: 'ผู้เช่า', href: '/admin/tenants' },
  { icon: <Wallet size={18} />, label: 'การชำระเงิน', href: '/admin/payments' },
  { icon: <Bell size={18} />, label: 'การติดต่อ', href: '/admin/inquiries' },
  { icon: <Users size={18} />, label: 'จัดการเจ้าของ', href: '/admin/owners' },
  { icon: <Building2 size={18} />, label: 'ตึก/โครงการ', href: '/admin/buildings' },
  { icon: <Share2 size={18} />, label: 'โพสต์ Facebook', href: '/admin/facebook-post' },
  { icon: <Calendar size={18} />, label: 'ปฏิทินโพสต์', href: '/admin/calendar' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    ['/admin/properties', '/admin/owners', '/admin/buildings', '/admin/tenants', '/admin/rentals', '/admin/payments'].includes(href)
      ? pathname.startsWith(href)
      : pathname === href

  const handleLogout = async () => {
    await signOut()
    router.replace('/admin/login')
  }

  const sidebarContent = (
    <>
      <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <Image src="/logo.png" alt="The Cozy Keys" width={612} height={408} className="h-20 w-auto" />
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>Admin Panel</div>
          </div>
          <button className="md:hidden p-1.5 rounded-lg" style={{ color: 'var(--text-mid)' }} onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="p-4 flex flex-col gap-1 flex-1">
        {NAV.map(({ icon, label, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
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

      <div className="p-4 border-t space-y-2" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full transition-all"
          style={{ background: 'var(--terracotta)', color: 'white' }}
        >
          <Eye size={16} /> ดูหน้าเว็บ
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full transition-all border"
          style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)', background: 'transparent' }}
        >
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
        <Image src="/logo.png" alt="The Cozy Keys" width={612} height={408} className="h-10 w-auto" />
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl" style={{ color: 'var(--text-mid)' }}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay + drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
          <aside
            className="absolute top-0 left-0 bottom-0 w-72 flex flex-col shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 border-r flex-col"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', minHeight: '100vh' }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
