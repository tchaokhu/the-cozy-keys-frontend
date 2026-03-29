'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(245,240,232,0.95)' : 'rgba(245,240,232,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(196,98,45,0.15)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="font-serif text-xl font-bold"
            style={{ color: 'var(--brown)' }}
          >
            The Cozy{' '}
            <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>Keys</em>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 list-none">
          {[
            { href: '/listings', label: 'ทรัพย์ให้เช่า' },
            { href: '/#areas', label: 'พื้นที่' },
            { href: '/#about', label: 'เกี่ยวกับเรา' },
          ].map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm font-normal transition-colors duration-200"
                style={{ color: 'var(--text-mid)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--terracotta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-mid)')}
              >
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/contact"
              className="text-sm font-medium text-white rounded-full px-5 py-2 transition-all duration-200"
              style={{ background: 'var(--terracotta)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--terracotta-dark)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--terracotta)')}
            >
              ติดต่อ
            </Link>
          </li>
        </ul>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: 'var(--brown)' }}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ borderTop: '1px solid rgba(196,98,45,0.1)' }}
        >
          {[
            { href: '/listings', label: 'ทรัพย์ให้เช่า' },
            { href: '/#areas', label: 'พื้นที่' },
            { href: '/#about', label: 'เกี่ยวกับเรา' },
            { href: '/contact', label: 'ติดต่อ' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-base font-medium"
              style={{ color: 'var(--text-mid)' }}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
