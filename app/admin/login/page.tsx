'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>
            The Cozy <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>Keys</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl border p-6 space-y-4"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>อีเมล</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
              placeholder="admin@example.com" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>รหัสผ่าน</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-dark)' }}
              placeholder="••••••••" />
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'var(--terracotta)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}
