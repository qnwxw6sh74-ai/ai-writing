'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, User } from 'lucide-react'
import { getUserErrorMessage } from '@/lib/fetch-utils'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string; mailSent: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    // 前端校验
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    if (!password || password.length < 6) {
      setError('密码至少需要6位')
      return
    }
    if (nickname.length > 50) {
      setError('昵称最多50个字符')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败')
        return
      }

      setResult(data)
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
          <h1 className="text-2xl font-bold text-white">注册</h1>
          <p className="text-zinc-400 mt-2">创建账号，开始AI创作之旅</p>
        </div>

        {result ? (
          <div className={`rounded-xl p-6 text-center space-y-4 ${
            result.mailSent
              ? 'bg-green-950/30 border border-green-900/30'
              : 'bg-yellow-950/30 border border-yellow-900/30'
          }`}>
            <div className="text-4xl">{result.mailSent ? '📬' : '⚠️'}</div>
            <h2 className="text-lg font-bold text-white">
              {result.mailSent ? '注册成功！' : '注册成功，但...'}
            </h2>
            <p className="text-sm text-zinc-300">{result.message}</p>
            {!result.mailSent && (
              <Link href="/login" className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 text-sm">
                先去登录
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            {error && (
              <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-300 text-center">
                {error}
              </div>
            )}

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
              <label className="block text-sm text-zinc-400 mb-1.5">昵称（可选）</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="给自己起个名字"
                  maxLength={50}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">密码（至少6位）</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少6位密码"
                  required
                  minLength={6}
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
              {loading ? '注册中...' : '注册'}
            </button>

            <p className="text-center text-sm text-zinc-500">
              已有账号？{' '}
              <Link href="/login" className="text-red-400 hover:text-red-300">
                登录
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
