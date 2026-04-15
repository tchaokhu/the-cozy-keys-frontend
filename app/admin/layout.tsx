'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSession, onAuthStateChange } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Skip auth check on the login page itself
    if (pathname === '/admin/login') {
      setChecked(true)
      return
    }

    getSession().then(session => {
      if (!session) {
        router.replace('/admin/login')
      } else {
        setChecked(true)
      }
    })

    const { data: { subscription } } = onAuthStateChange(session => {
      if (!session && pathname !== '/admin/login') {
        router.replace('/admin/login')
      }
    })

    // Refresh session every 10 minutes to prevent expiry during use
    const refreshInterval = setInterval(() => {
      getSession() // internally refreshes if expired
    }, 10 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [pathname, router])

  // Login page renders immediately; other pages wait for auth check
  if (pathname === '/admin/login') return <>{children}</>
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <div className="text-sm" style={{ color: 'var(--text-light)' }}>กำลังตรวจสอบสิทธิ์...</div>
      </div>
    )
  }

  return <>{children}</>
}
