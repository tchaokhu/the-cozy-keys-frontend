import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export function getServerSupabase() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot mutate cookies — safe to ignore.
        }
      },
    },
  })
}

export async function requireAdmin() {
  const sb = getServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')

  const { data, error } = await sb
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('requireAdmin: admins lookup failed', error)
    throw new Error('UNAUTHORIZED')
  }
  if (!data) throw new Error('UNAUTHORIZED')

  return user
}
