'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      console.log('[Login] signInWithPassword 開始')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('[Login] 認証エラー:', error.message)
        setError(translateError(error.message))
        return
      }
      console.log('[Login] 認証成功 user:', data.user?.email, 'session:', !!data.session)

      // セッションが Cookie に書き込まれるのを待つ
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Login] getSession 確認:', !!session)

      // router.refresh() でサーバーコンポーネントのキャッシュをクリアしてから遷移
      router.refresh()
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-[#283417] mb-6">ログイン</h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <Field
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
        />
        <Field
          label="パスワード"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded text-white font-medium transition-colors disabled:opacity-60"
          style={{ background: loading ? '#6b8a3a' : '#556B2F' }}
          onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = '#435626' }}
          onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = '#556B2F' }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        アカウントをお持ちでない方は{' '}
        <Link href="/register" className="text-[#556B2F] hover:text-[#435626] font-medium underline underline-offset-2">
          新規登録
        </Link>
      </p>
    </AuthLayout>
  )
}

// ────────────────────────────────────────
// 共通コンポーネント
// ────────────────────────────────────────
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f4f6ef 0%, #e5ecda 100%)' }}
    >
      {/* ロゴ */}
      <div className="flex items-center gap-2 mb-8 select-none">
        <div className="flex flex-col gap-[3px]">
          <div style={{ width: '20px', height: '4px', background: '#556B2F', borderRadius: '2px', marginLeft: '6px' }} />
          <div style={{ width: '20px', height: '4px', background: '#6b8a3a', borderRadius: '2px', marginLeft: '3px' }} />
          <div style={{ width: '20px', height: '4px', background: '#a8c282', borderRadius: '2px', marginLeft: '0px' }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '24px', color: '#283417', letterSpacing: '-0.5px' }}>
          Strata
        </span>
      </div>

      {/* カード */}
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md px-8 py-8 border border-[#c9d9b4]">
        {children}
      </div>

      {/* フッター */}
      <p className="mt-6 text-xs text-gray-400">
        Strata Ver.1 　©2026 ABC LLC. All rights reserved.
      </p>
    </div>
  )
}

function Field({
  label, type, value, onChange, placeholder, required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none transition-colors"
        style={{ borderColor: undefined }}
        onFocus={(e) => (e.target.style.borderColor = '#6b8a3a')}
        onBlur={(e) => (e.target.style.borderColor = '')}
      />
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません。'
  if (msg.includes('Email not confirmed')) return 'メールアドレスの確認が完了していません。'
  if (msg.includes('Too many requests')) return 'しばらく時間をおいてから再試行してください。'
  return msg
}
