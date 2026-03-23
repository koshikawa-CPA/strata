import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Supabase が未設定の場合はスキップ（ローカルのlocaStorage動作を維持）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const isConfigured =
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('xxxxxxxxxxxxxxxxxxxx') &&
    supabaseAnonKey.length > 0

  if (!isConfigured) return NextResponse.next()

  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value
      },
      set(name, value, options) {
        req.cookies.set({ name, value, ...options })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value, ...options })
      },
      remove(name, options) {
        req.cookies.set({ name, value: '', ...options })
        res = NextResponse.next({ request: { headers: req.headers } })
        res.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
