import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ブラウザ用クライアント：
// createBrowserClient を使うことでセッションをCookieに保存し、
// ミドルウェアの createServerClient と同じセッションを共有できる。
// Supabase 未設定時はフォールバック（localStorage ベース）
export const supabase = (() => {
  const isConfigured =
    supabaseUrl.length > 0 && !supabaseUrl.includes('xxxxxxxxxxxxxxxxxxxx')

  if (isConfigured) {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // 未設定時は通常クライアント（localStorage）でフォールバック
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
  )
})()
