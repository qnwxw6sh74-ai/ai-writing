'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Settings, Key, Save, ArrowLeft, History, FileText, Download, Upload, Trash2, ChevronLeft, ChevronRight, Gift, Copy, Check } from 'lucide-react'
import { getUserErrorMessage } from '@/lib/fetch-utils'

interface HistoryItem {
  id: number
  type: 'article' | 'export' | 'import'
  title: string
  word_count: number
  metadata: any
  created_at: string
}

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

  // Tab + 历史
  const [tab, setTab] = useState<'profile' | 'history'>('profile')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyType, setHistoryType] = useState('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)

  // 邀请
  const [inviteCode, setInviteCode] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [invitedCount, setInvitedCount] = useState(0)
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchInvite()
  }, [])

  const fetchInvite = async () => {
    try {
      const res = await fetch('/api/invite/stats')
      if (res.ok) {
        const data = await res.json()
        setInviteCode(data.inviteCode || '')
        setInviteUrl(data.inviteUrl || '')
        setInvitedCount(data.invitedCount || 0)
      }
    } catch { /* */ }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  useEffect(() => {
    if (tab === 'history') fetchHistory()
  }, [tab, historyType, historyPage])

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/history?type=${historyType}&page=${historyPage}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.items || [])
        setHistoryTotal(data.total || 0)
      }
    } catch { /* */ }
    finally { setHistoryLoading(false) }
  }

  const deleteHistory = async (id: number) => {
    await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
    fetchHistory()
  }

  const typeIcon = (t: string) => t === 'article' ? <FileText size={14} /> : t === 'export' ? <Download size={14} /> : <Upload size={14} />
  const typeLabel = (t: string) => t === 'article' ? '文章' : t === 'export' ? '导出' : '导入'

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
    } catch (e) {
      setError(getUserErrorMessage(e, '保存失败，请稍后重试'))
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
    } catch (e) {
      setError(getUserErrorMessage(e, '密码修改失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.dispatchEvent(new Event('auth-changed'))
    router.push('/')
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

        {/* Tab 切换 */}
        <div className="flex border-b border-zinc-800 mb-6">
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'profile' ? 'border-red-500 text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User size={14} className="inline mr-1.5" />
            个人信息
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'history' ? 'border-red-500 text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <History size={14} className="inline mr-1.5" />
            历史记录
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

        {/* 邀请 */}
        {inviteCode && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Gift size={18} className="text-yellow-400" /> 邀请好友
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              邀请好友注册，双方各得 <span className="text-yellow-400 font-bold">3 次</span> 充值额度 · 已成功邀请 <span className="text-yellow-400 font-bold">{invitedCount}</span> 人
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 break-all">{inviteUrl}</code>
              <button
                onClick={copyInvite}
                className="flex items-center gap-1 text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors shrink-0"
              >
                {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                {inviteCopied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        )}

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

        {/* ====== Tab: 历史记录 ====== */}
        {tab === 'history' && (
          <div>
            {/* 类型筛选 */}
            <div className="flex gap-2 mb-4">
              {['all', 'article', 'export', 'import'].map(t => (
                <button
                  key={t}
                  onClick={() => { setHistoryType(t); setHistoryPage(1) }}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    historyType === t ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === 'all' ? '全部' : typeLabel(t)}
                </button>
              ))}
            </div>

            {/* 列表 */}
            {historyLoading ? (
              <div className="text-center py-12 text-zinc-500">加载中...</div>
            ) : history.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-sm">
                暂无记录
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 rounded ${
                        item.type === 'article' ? 'bg-blue-950/50 text-blue-400' :
                        item.type === 'export' ? 'bg-green-950/50 text-green-400' :
                        'bg-purple-950/50 text-purple-400'
                      }`}>
                        {typeIcon(item.type)}
                      </span>
                      <div>
                        <p className="text-sm text-zinc-200 font-medium">{item.title}</p>
                        <p className="text-xs text-zinc-600">
                          {typeLabel(item.type)} · {item.word_count}字 · {new Date(item.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteHistory(item.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {historyTotal > 20 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="p-1.5 rounded bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-zinc-500">{historyPage} / {Math.ceil(historyTotal / 20)}</span>
                <button
                  onClick={() => setHistoryPage(p => p + 1)}
                  disabled={historyPage >= Math.ceil(historyTotal / 20)}
                  className="p-1.5 rounded bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
