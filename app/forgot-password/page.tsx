'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { getUserErrorMessage } from '@/lib/fetch-utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage(data.message || '重置邮件已发送')
      } else {
        setError(data.error || '发送失败')
      }
    } catch (e) {
      setError(getUserErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">忘记密码</h1>
          <p className="text-zinc-400 mt-2">输入注册邮箱，我们将发送重置链接</p>
        </div>

        {message && (
          <div className="mb-4 bg-green-950/30 border border-green-900/30 rounded-lg p-4 text-sm text-green-300 text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">注册邮箱</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? '发送中...' : '发送重置链接'}
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
