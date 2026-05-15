'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, Home, Bell, Share2, Eye, Users, Menu, X, LogOut, Building2, KeyRound, FileText, Wallet, Layers, UserCircle2, ChevronDown, Files } from 'lucide-react'
import { getSession, onAuthStateChange, signOut } from '@/lib/supabase'

const STANDALONE = { icon: <BarChart2 size={18} />, label: 'ภาพรวม', href: '/admin/dashboard' }

type SectionKey = 'operations' | 'data' | 'marketing' | 'documents'

const SECTIONS: { key: SectionKey; label: string; items: { icon: React.ReactNode; label: string; href: string }[] }[] = [
  {
    key: 'operations',
    label: 'การดำเนินงาน',
    items: [
      { icon: <Home size={18} />, label: 'ทรัพย์ทั้งหมด', href: '/admin/properties' },
      { icon: <FileText size={18} />, label: 'สัญญาเช่า', href: '/admin/rentals' },
      { icon: <Wallet size={18} />, label: 'การชำระเงิน', href: '/admin/payments' },
      { icon: <Bell size={18} />, label: 'การติดต่อ', href: '/admin/inquiries' },
    ],
  },
  {
    key: 'data',
    label: 'ข้อมูลหลัก',
    items: [
      { icon: <KeyRound size={18} />, label: 'ผู้เช่า', href: '/admin/tenants' },
      { icon: <Users size={18} />, label: 'เจ้าของ', href: '/admin/owners' },
      { icon: <Building2 size={18} />, label: 'ตึก/โครงการ', href: '/admin/buildings' },
      { icon: <Share2 size={18} />, label: 'ช่องทางโพสต์', href: '/admin/platforms' },
    ],
  },
  {
    key: 'marketing',
    label: 'การตลาด',
    items: [
      { icon: <Share2 size={18} />, label: 'โพสต์ Facebook', href: '/admin/facebook-post' },
      { icon: <Layers size={18} />, label: 'เทมเพลตโพสต์', href: '/admin/post-templates' },
    ],
  },
  {
    key: 'documents',
    label: 'เอกสาร',
    items: [
      { icon: <Files size={18} />, label: 'เอกสารต้นแบบ', href: '/admin/documents' },
    ],
  },
]

const STORAGE_KEY = 'admin.nav.collapsed'

function getSectionForPath(pathname: string): SectionKey | null {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (pathname.startsWith(item.href)) return section.key
    }
  }
  return null
}

type CollapsedState = Record<SectionKey, boolean>

const ALL_EXPANDED: CollapsedState = { operations: false, data: false, marketing: false, documents: false }
const ALL_COLLAPSED: CollapsedState = { operations: true, data: true, marketing: true, documents: true }

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  // Start fully expanded to avoid hydration mismatch; useEffect adjusts from localStorage
  const [collapsed, setCollapsed] = useState<CollapsedState>(ALL_EXPANDED)

  useEffect(() => {
    let alive = true
    getSession().then(r => {
      if (!alive) return
      if (r.kind === 'session') setEmail(r.session.user.email ?? null)
    })
    const { data: { subscription } } = onAuthStateChange(s => {
      const sess = s as { user?: { email?: string | null } } | null
      setEmail(sess?.user?.email ?? null)
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  // Initialise collapse state from localStorage after mount (SSR-safe)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    let stored: CollapsedState | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) stored = JSON.parse(raw) as CollapsedState
    } catch {
      // ignore parse errors
    }

    if (isMobile) {
      // On mobile default: collapse all except the active section
      const activeSection = getSectionForPath(pathname)
      const base: CollapsedState = { ...ALL_COLLAPSED }
      if (activeSection) base[activeSection] = false
      setCollapsed(stored ?? base)
    } else {
      setCollapsed(stored ?? ALL_EXPANDED)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-expand section containing the current route on navigation
  useEffect(() => {
    const activeSection = getSectionForPath(pathname)
    if (!activeSection) return
    setCollapsed(prev => {
      if (!prev[activeSection]) return prev
      const next = { ...prev, [activeSection]: false }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [pathname])

  const toggleSection = (key: SectionKey) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const isActive = (href: string) =>
    ['/admin/properties', '/admin/owners', '/admin/buildings', '/admin/tenants', '/admin/rentals', '/admin/payments', '/admin/post-templates', '/admin/documents', '/admin/platforms'].includes(href)
      ? pathname.startsWith(href)
      : pathname === href

  const handleLogout = async () => {
    await signOut()
    router.replace('/admin/login')
  }

  const NavLink = ({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all"
        style={{
          color: active ? 'white' : 'rgba(255,255,255,0.95)',
          background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
          boxShadow: active ? 'inset 3px 0 0 0 var(--terracotta-light)' : 'none',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = 'white'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
          }
        }}
      >
        {icon} {label}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-xl px-3 py-2 inline-block">
            <Image src="/logo.png" alt="The Cozy Keys" width={612} height={408} className="h-16 w-auto" />
          </div>
          <button className="md:hidden p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="text-xs mt-2 font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>Admin Panel</div>
      </div>

      <nav className="p-3 flex flex-col gap-0.5 flex-1">
        {/* Standalone dashboard item */}
        <NavLink {...STANDALONE} />

        {/* Divider */}
        <div className="my-2 mx-1" style={{ height: 1, background: 'rgba(255,255,255,0.10)' }} />

        {/* Collapsible sections */}
        {SECTIONS.map(section => (
          <div key={section.key}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.75)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            >
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{section.label}</span>
              <ChevronDown
                size={14}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: collapsed[section.key] ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Section items */}
            {!collapsed[section.key] && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {section.items.map(item => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            )}

            <div className="my-2 mx-1" style={{ height: 1, background: 'rgba(255,255,255,0.10)' }} />
          </div>
        ))}
      </nav>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 gap-2"
        style={{
          background: 'linear-gradient(90deg, var(--terracotta-dark) 0%, var(--terracotta) 100%)',
          boxShadow: '0 2px 12px rgba(139,62,24,0.18)',
        }}>
        <div className="bg-white rounded-lg px-2 py-1">
          <Image src="/logo.png" alt="The Cozy Keys" width={612} height={408} className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-1">
          <Link href="/" className="p-2 rounded-xl" style={{ color: 'white' }} aria-label="ดูหน้าเว็บ">
            <Eye size={20} />
          </Link>
          <button onClick={handleLogout} className="p-2 rounded-xl" style={{ color: 'white' }} aria-label="ออกจากระบบ">
            <LogOut size={20} />
          </button>
          <button onClick={() => setOpen(true)} className="p-2 rounded-xl" style={{ color: 'white' }} aria-label="เมนู">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:flex fixed top-0 left-64 right-0 z-30 h-16 items-center justify-end gap-3 px-6"
        style={{
          background: 'linear-gradient(90deg, var(--terracotta-dark) 0%, var(--terracotta) 100%)',
          boxShadow: '0 2px 12px rgba(139,62,24,0.18)',
        }}>
        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.95)' }}>
          <UserCircle2 size={20} style={{ color: 'rgba(255,255,255,0.85)' }} />
          <span className="text-sm font-medium max-w-[220px] truncate" title={email ?? ''}>{email ?? '...'}</span>
        </div>
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.25)' }} />
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'white', color: 'var(--terracotta-dark)' }}
        >
          <Eye size={16} /> ดูหน้าเว็บ
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border"
          style={{ borderColor: 'rgba(255,255,255,0.45)', color: 'white', background: 'transparent' }}
        >
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>

      {/* Mobile overlay + drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
          <aside
            className="absolute top-0 left-0 bottom-0 w-72 flex flex-col shadow-xl"
            style={{ background: 'linear-gradient(180deg, var(--terracotta-dark) 0%, var(--brown) 60%, var(--text-dark) 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col"
        style={{
          background: 'linear-gradient(180deg, var(--terracotta-dark) 0%, var(--brown) 60%, var(--text-dark) 100%)',
          minHeight: '100vh',
          boxShadow: '2px 0 16px rgba(0,0,0,0.08)',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
