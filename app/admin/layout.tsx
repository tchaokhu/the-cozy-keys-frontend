'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChange } from '@/lib/supabase'

// Middleware is the authoritative gate — it verifies the session AND admin
// membership at the edge. This client layout only wires up a sign-out redirect
// so the tab navigates away the instant the user signs out in another tab.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/admin/login') return
    const { data: { subscription } } = onAuthStateChange(session => {
      if (!session) router.replace('/admin/login')
    })
    return () => subscription.unsubscribe()
  }, [pathname, router])

  return <>{children}</>
}
