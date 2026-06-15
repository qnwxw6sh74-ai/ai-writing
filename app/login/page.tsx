'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      setSuccess('邮箱验证成功！请登录')
    }
    if (searchParams.get('reset') === '1') {
      setSuccess('密码重置成功！请使用新密码登录')
    }
    if (searchParams.get('error')) {
      const errMap: Record<string, string> = {
        invalid_token: '验证链接无效或已过期',
        token_expired: '验证链接已过期，请重新注册',
        verify_failed: '验证失败，请重试',
      }
      setError(errMap[searchParams.get('error') || ''] || '验证失败')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // 前端校验
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }

      window.dispatchEvent(new Event('auth-changed'))
      router.push('/generate')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">登录</h1>
          <p className="text-zinc-400 mt-2">登录后开始AI创作</p>
        </div>

        {success && (
          <div className="mb-4 bg-green-950/30 border border-green-900/30 rounded-lg p-3 text-sm text-green-300 text-center">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                maxLength={254}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入密码"
                required
                maxLength={128}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            还没有账号？{' '}
            <Link href="/register" className="text-red-400 hover:text-red-300">
              注册
            </Link>
            <span className="mx-2 text-zinc-700">|</span>
            <Link href="/forgot-password" className="text-zinc-500 hover:text-zinc-300">
              忘记密码？
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-zinc-950 min-h-screen" />}>
      <LoginForm />
    </Suspense>
  )
}
