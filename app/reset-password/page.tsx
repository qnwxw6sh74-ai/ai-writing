'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }
    if (password !== confirm) {
      setError('两次密码不一致')
      return
    }
    if (!token) {
      setError('重置链接无效')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/login?reset=1'), 2000)
      } else {
        setError(data.error || '重置失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-white mb-2">密码重置成功</h1>
          <p className="text-zinc-400">即将跳转到登录页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">设置新密码</h1>
          <p className="text-zinc-400 mt-2">请输入您的新密码</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        {!token && (
          <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-4 text-sm text-red-300 text-center">
            缺少重置令牌。请从邮件中的链接访问此页面，或
            <Link href="/forgot-password" className="underline ml-1">重新申请</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">新密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少6位"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">确认密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="再次输入新密码"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? '重置中...' : '重置密码'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            <Link href="/login" className="flex items-center justify-center gap-1 text-zinc-400 hover:text-white">
              <ArrowLeft size={14} /> 返回登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-zinc-950 min-h-screen" />}>
      <ResetForm />
    </Suspense>
  )
}
