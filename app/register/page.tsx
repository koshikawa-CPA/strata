'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('パスワードが一致しません。')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。')
      return
    }

    setLoading(true)
    try {
      console.log('[Register] signUp 開始')
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        console.error('[Register] 登録エラー:', error.message)
        setError(translateError(error.message))
      } else {
        console.log('[Register] 登録完了 user:', data.user?.email, 'session:', !!data.session)
        // メール確認が不要な設定の場合はそのままリダイレクト
        // メール確認が必要な場合はメッセージを表示
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[Register] getSession 確認:', !!session)
        if (session) {
          router.refresh()
          router.push('/')
        } else {
          setSuccess(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-[#283417] mb-6">新規登録</h2>

      {success ? (
        <div className="text-center">
          <div className="text-4xl mb-4">✉️</div>
          <p className="text-sm text-gray-700 mb-2 font-medium">確認メールを送信しました</p>
          <p className="text-xs text-gray-500 mb-6">
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link
            href="/login"
            className="text-sm text-[#556B2F] hover:text-[#435626] font-medium underline underline-offset-2"
          >
            ログインページへ
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleRegister} className="space-y-4">
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
              placeholder="••••••••（6文字以上）"
              required
            />
            <Field
              label="パスワード（確認）"
              type="password"
              value={confirm}
              onChange={setConfirm}
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
              {loading ? '登録中...' : 'アカウントを作成'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-[#556B2F] hover:text-[#435626] font-medium underline underline-offset-2">
              ログイン
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

// ────────────────────────────────────────
// 共通コンポーネント（ログインページと同一）
// ────────────────────────────────────────
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f4f6ef 0%, #e5ecda 100%)' }}
    >
      <div className="flex items-center gap-2 mb-8 select-none">
        <div className="flex flex-col gap-[3px]">
          <div style={{ width: '20px', height: '4px', background: '#556B2F', borderRadius: '2px', marginLeft: '6px' }} />
          <div style={{ width: '20px', height: '4px', background: '#6b8a3a', borderRadius: '2px', marginLeft: '3px' }} />
          <div style={{ width: '20px', height: '4px', background: '#a8c282', borderRadius: '2px', marginLeft: '0px' }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '24px', color: '#283417', letterSpacing: '-0.5px' }}>
          Strata Note
        </span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-lg shadow-md px-8 py-8 border border-[#c9d9b4]">
        {children}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Strata Note Ver.1 　©2026 ABC LLC. All rights reserved.
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
        onFocus={(e) => (e.target.style.borderColor = '#6b8a3a')}
        onBlur={(e) => (e.target.style.borderColor = '')}
      />
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('User already registered')) return 'このメールアドレスはすでに登録されています。'
  if (msg.includes('Password should be')) return 'パスワードは6文字以上で入力してください。'
  if (msg.includes('Invalid email')) return '有効なメールアドレスを入力してください。'
  if (msg.includes('Too many requests')) return 'しばらく時間をおいてから再試行してください。'
  return msg
}
