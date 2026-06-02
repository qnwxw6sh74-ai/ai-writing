'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Settings, Key, Save, ArrowLeft } from 'lucide-react'

interface UserProfile {
  id: number
  email: string
  nickname: string
  email_verified: number
  bio: string
  favorite_keywords: string
  preferred_style: string
  total_generations: number
  total_exports: number
  created_at: string
  last_login_at: string
  credits: { remaining: number; total: number; purchasedCredits: number }
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 编辑状态
  const [editNickname, setEditNickname] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editKeywords, setEditKeywords] = useState('')
  const [editStyle, setEditStyle] = useState('')

  // 密码
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      if (data.error) {
        router.push('/login')
        return
      }
      setProfile(data)
      setEditNickname(data.nickname || '')
      setEditBio(data.bio || '')
      setEditKeywords(data.favorite_keywords || '')
      setEditStyle(data.preferred_style || '')
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: editNickname,
          bio: editBio,
          favorite_keywords: editKeywords,
          preferred_style: editStyle,
        }),
      })
      if (res.ok) {
        setSuccess('保存成功')
        fetchProfile()
      } else {
        const d = await res.json()
        setError(d.error || '保存失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setError('请填写当前密码和新密码')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setSuccess('密码修改成功')
        setCurrentPassword('')
        setNewPassword('')
        setShowPassword(false)
      } else {
        const d = await res.json()
        setError(d.error || '修改失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/generate" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
            <ArrowLeft size={16} />
            返回
          </Link>
          <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-red-400">
            退出登录
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-950/30 border border-green-900/30 rounded-lg p-3 text-sm text-green-300">
            {success}
          </div>
        )}

        {/* 基本信息卡片 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <User size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{profile?.nickname || profile?.email}</h2>
              <p className="text-sm text-zinc-500">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-lg font-bold text-red-400">{profile?.credits?.remaining ?? '-'}</div>
              <div className="text-xs text-zinc-500">剩余额度</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{profile?.total_generations ?? 0}</div>
              <div className="text-xs text-zinc-500">总生成次数</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{profile?.total_exports ?? 0}</div>
              <div className="text-xs text-zinc-500">总导出次数</div>
            </div>
          </div>
        </div>

        {/* 编辑资料 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Settings size={18} className="text-zinc-400" /> 编辑资料
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">昵称</label>
              <input
                value={editNickname}
                onChange={e => setEditNickname(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">个人简介</label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">常用关键词（逗号分隔）</label>
              <input
                value={editKeywords}
                onChange={e => setEditKeywords(e.target.value)}
                placeholder="如：中年婚姻,职场生存,副业赚钱"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">偏好文章风格</label>
              <select
                value={editStyle}
                onChange={e => setEditStyle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option value="">不限</option>
                <option value="通俗易懂">通俗易懂</option>
                <option value="专业深度">专业深度</option>
                <option value="幽默风趣">幽默风趣</option>
                <option value="情感共鸣">情感共鸣</option>
                <option value="犀利观点">犀利观点</option>
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 text-sm disabled:opacity-50"
            >
              <Save size={16} /> {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 修改密码 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-zinc-400" /> 修改密码
          </h3>
          {!showPassword ? (
            <button
              onClick={() => setShowPassword(true)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              点击修改密码
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="当前密码"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="新密码（至少6位）"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 text-sm disabled:opacity-50"
                >
                  {saving ? '修改中...' : '确认修改'}
                </button>
                <button
                  onClick={() => { setShowPassword(false); setCurrentPassword(''); setNewPassword('') }}
                  className="text-sm text-zinc-500 hover:text-zinc-300"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
