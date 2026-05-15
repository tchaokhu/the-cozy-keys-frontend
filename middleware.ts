import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Fail closed: refuse admin routes when Supabase env is missing
    // rather than letting requests through unauthenticated.
    if (req.nextUrl.pathname.startsWith('/admin')) {
      return new NextResponse('Server misconfigured: Supabase env vars missing', { status: 500 })
    }
    return res
  }

  const sb = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await sb.auth.getUser()

  const path = req.nextUrl.pathname
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login'

  if (isAdminRoute && !user) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    return NextResponse.redirect(loginUrl)
  }

  // Authed-but-not-admin: someone who self-signed-up via Supabase Auth would
  // otherwise reach the admin shell. Block at the edge and force sign-out.
  if (isAdminRoute && user) {
    const { data: adminRow } = await sb
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!adminRow) {
      await sb.auth.signOut()
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(loginUrl)
    }
  }

  if (path === '/admin/login' && user) {
    const home = req.nextUrl.clone()
    home.pathname = '/admin/dashboard'
    return NextResponse.redirect(home)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
