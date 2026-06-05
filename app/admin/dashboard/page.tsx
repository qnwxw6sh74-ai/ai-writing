"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, LogOut, Globe, DollarSign, PanelRight, ClipboardList, Plus, Trash2, Save, Info, BookOpen, Terminal, Cpu, Users, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface SiteConfig {
  key: string; value: string; type: string; description: string; group: string
}
interface Changelog {
  id: number; version: string; changes: string; published_at: string
}
interface AboutSection {
  title: string; content: string; list: string[]; muted: boolean
}
interface PromptTemplate {
  id: number; name: string; type: string; domain: string; system_prompt: string; user_prompt_template: string; is_active: number; sort_order: number
}
interface AIModel {
  id: number; name: string; provider: string; api_key: string; base_url: string; model: string; max_tokens: number; temperature: number; is_active: number; keyword_triggers: string; sort_order: number
}
interface AdminUser {
  id: number; email: string; nickname: string; email_verified: number
  total_generations: number; total_exports: number
  purchased_credits: number; credits_used: number
  created_at: string; last_login_at: string
}

const tabs = [
  { id: "general", label: "站点设置", icon: Globe },
  { id: "content", label: "内容管理", icon: BookOpen },
  { id: "about", label: "关于我们", icon: Info },
  { id: "changelogs", label: "更新日志", icon: ClipboardList },
  { id: "prompts", label: "Prompt管理", icon: Terminal },
  { id: "ads", label: "广告管理", icon: PanelRight },
  { id: "payment", label: "支付设置", icon: DollarSign },
  { id: "seo", label: "SEO设置", icon: FileText },
  { id: "models", label: "AI模型", icon: Cpu },
  { id: "users", label: "用户列表", icon: Users },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("general")
  const [settings, setSettings] = useState<SiteConfig[]>([])
  const [changelogs, setChangelogs] = useState<Changelog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  // 更新日志编辑状态
  const [editingLog, setEditingLog] = useState<Changelog | null>(null)
  const [newLog, setNewLog] = useState(false)
  // 关于我们编辑状态
  const [aboutSections, setAboutSections] = useState<AboutSection[]>([])
  const [editingAboutIdx, setEditingAboutIdx] = useState<number | null>(null)
  // Prompt 管理状态
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null)
  const [newPrompt, setNewPrompt] = useState(false)
  // AI模型状态
  const [models, setModels] = useState<AIModel[]>([])
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [newModel, setNewModel] = useState(false)

  // 用户列表状态
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState("")
  const [userLoading, setUserLoading] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchChangelogs()
    fetchAbout()
    fetchPrompts()
    fetchModels()
  }, [])

  useEffect(() => {
    if (activeTab === "users") fetchUsers()
  }, [activeTab, userPage, userSearch])

  const fetchPrompts = async () => {
    try {
      const res = await fetch("/api/admin/prompts")
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch { /* ignore */ }
  }

  const handleSavePrompt = async () => {
    if (!editingPrompt) return
    setSaving("prompt")
    try {
      if (editingPrompt.id === 0) {
        await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingPrompt),
        })
      } else {
        await fetch("/api/admin/prompts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingPrompt),
        })
      }
      setMessage("✅ Prompt 已保存")
      setTimeout(() => setMessage(""), 2000)
      setEditingPrompt(null)
      setNewPrompt(false)
      fetchPrompts()
    } catch { setMessage("❌ 保存失败") }
    finally { setSaving(null) }
  }

  const handleDeletePrompt = async (id: number) => {
    if (!confirm("确定要删除这个 Prompt 吗？")) return
    await fetch(`/api/admin/prompts?id=${id}`, { method: "DELETE" })
    setMessage("✅ 已删除")
    setTimeout(() => setMessage(""), 2000)
    fetchPrompts()
  }

  // === AI 模型管理 ===
  const fetchModels = async () => {
    try {
      const res = await fetch("/api/admin/models")
      const data = await res.json()
      setModels(data.models || [])
    } catch { /* ignore */ }
  }

  const handleSaveModel = async () => {
    if (!editingModel) return
    setSaving("model")
    try {
      if (editingModel.id === 0) {
        await fetch("/api/admin/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingModel),
        })
      } else {
        await fetch("/api/admin/models", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingModel),
        })
      }
      setMessage("✅ 模型已保存")
      setTimeout(() => setMessage(""), 2000)
      setEditingModel(null)
      setNewModel(false)
      fetchModels()
    } catch { setMessage("❌ 保存失败") }
    finally { setSaving(null) }
  }

  const handleDeleteModel = async (id: number) => {
    if (!confirm("确定要删除这个 AI 模型吗？")) return
    const res = await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { setMessage(`❌ ${data.error || "删除失败"}`); setTimeout(() => setMessage(""), 2000); return }
    setMessage("✅ 已删除")
    setTimeout(() => setMessage(""), 2000)
    fetchModels()
  }

  // === 用户列表 ===
  const fetchUsers = async () => {
    setUserLoading(true)
    try {
      const params = new URLSearchParams()
      if (userSearch) params.set("search", userSearch)
      params.set("page", String(userPage))
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.status === 401) { router.push("/admin/login"); return }
      const data = await res.json()
      setUsers(data.users || [])
      setUserTotal(data.total || 0)
    } catch { /* ignore */ }
    finally { setUserLoading(false) }
  }

  const totalPages = Math.max(1, Math.ceil(userTotal / 20))

  const fetchAbout = async () => {
    try {
      const res = await fetch("/api/admin/settings?group=content")
      const data = await res.json()
      const aboutRow = (data.settings || []).find((s: SiteConfig) => s.key === "about_content")
      if (aboutRow?.value) {
        setAboutSections(JSON.parse(aboutRow.value))
      }
    } catch { /* ignore */ }
  }

  const saveAbout = async () => {
    setSaving("about")
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "about_content", value: JSON.stringify(aboutSections) }),
      })
      setMessage("✅ 关于我们内容已保存")
      setTimeout(() => setMessage(""), 2000)
    } catch { setMessage("❌ 保存失败") }
    finally { setSaving(null) }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.status === 401) { router.push("/admin/login"); return }
      const data = await res.json()
      setSettings(data.settings || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const fetchChangelogs = async () => {
    try {
      const res = await fetch("/api/admin/changelogs")
      const data = await res.json()
      setChangelogs(data.changelogs || [])
    } catch { /* ignore */ }
  }

  const handleChange = (key: string, newValue: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value: newValue } : s)))
  }

  const handleSave = async (setting: SiteConfig) => {
    setSaving(setting.key)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value: setting.value }),
      })
      if (res.ok) { setMessage(`✅ ${setting.description || setting.key} 已保存`); setTimeout(() => setMessage(""), 2000) }
    } catch { setMessage("❌ 保存失败") }
    finally { setSaving(null) }
  }

  // 更新日志操作
  const handleSaveLog = async () => {
    if (!editingLog) return
    setSaving("log")
    try {
      const changes = editingLog.changes.split("\n").filter(Boolean)
      if (editingLog.id === 0) {
        // 新增
        await fetch("/api/admin/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: editingLog.version, changes, published_at: editingLog.published_at }),
        })
      } else {
        // 更新
        await fetch("/api/admin/changelogs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingLog.id, version: editingLog.version, changes, published_at: editingLog.published_at }),
        })
      }
      setMessage("✅ 更新日志已保存")
      setTimeout(() => setMessage(""), 2000)
      setEditingLog(null)
      setNewLog(false)
      fetchChangelogs()
    } catch { setMessage("❌ 保存失败") }
    finally { setSaving(null) }
  }

  const handleDeleteLog = async (id: number) => {
    if (!confirm("确定要删除这条更新日志吗？")) return
    await fetch(`/api/admin/changelogs?id=${id}`, { method: "DELETE" })
    setMessage("✅ 已删除")
    setTimeout(() => setMessage(""), 2000)
    fetchChangelogs()
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    router.push("/admin/login")
  }

  const filteredSettings = settings.filter((s) => s.group === activeTab)
  const inputClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">⚙️ 管理后台 <span className="text-xs text-red-600 bg-red-950 px-2 py-0.5 rounded ml-2">v3</span></h1>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut size={16} /> 退出登录
          </button>
        </div>

        {message && <div className="mb-4 px-4 py-2 bg-red-950/50 text-red-300 rounded-lg text-sm border border-red-900/30">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-red-950/30 text-red-300 border-l-2 border-red-600"
                      : "text-zinc-400 hover:bg-zinc-800/50 border-l-2 border-transparent"
                  }`}>
                  <tab.icon size={18} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            {/* ===== 关于我们编辑 ===== */}
            {activeTab === "about" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">关于我们</h2>
                    <p className="text-zinc-500 text-sm">编辑页面上展示的内容，支持标题/正文/列表</p>
                  </div>
                  <button onClick={saveAbout} disabled={saving === "about"}
                    className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                    <Save size={14} /> {saving === "about" ? "保存中..." : "保存全部"}
                  </button>
                </div>

                <div className="space-y-4">
                  {aboutSections.map((section, idx) => (
                    <div key={idx} className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-4">
                      {editingAboutIdx === idx ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-zinc-400 mb-1">标题</label>
                              <input type="text" value={section.title} onChange={(e) => {
                                const next = [...aboutSections]; next[idx] = { ...next[idx], title: e.target.value }; setAboutSections(next)
                              }} className={inputClasses} />
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={section.muted} onChange={(e) => {
                                  const next = [...aboutSections]; next[idx] = { ...next[idx], muted: e.target.checked }; setAboutSections(next)
                                }} className="rounded" />
                                <span className="text-sm text-zinc-400">灰色显示</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">正文</label>
                            <textarea value={section.content} onChange={(e) => {
                              const next = [...aboutSections]; next[idx] = { ...next[idx], content: e.target.value }; setAboutSections(next)
                            }} rows={4} className={`${inputClasses} resize-none`} />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">列表项（每行一项，支持 HTML）</label>
                            <textarea value={section.list.join("\n")} onChange={(e) => {
                              const next = [...aboutSections]; next[idx] = { ...next[idx], list: e.target.value.split("\n").filter(Boolean) }; setAboutSections(next)
                            }} rows={4} className={`${inputClasses} resize-none`} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => {
                              const next = [...aboutSections]; next.splice(idx, 1); setAboutSections(next); setEditingAboutIdx(null)
                            }} className="text-sm text-red-400 hover:text-red-300 px-2 py-1">删除此项</button>
                            <button onClick={() => setEditingAboutIdx(null)}
                              className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg">完成</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between group cursor-pointer" onClick={() => setEditingAboutIdx(idx)}>
                          <div>
                            <h3 className={`text-sm font-bold ${section.muted ? "text-zinc-500" : "text-zinc-200"}`}>{section.title}</h3>
                            <p className="text-xs text-zinc-500 mt-1">
                              {section.content ? section.content.slice(0, 80) + "..." : `${section.list.length} 个列表项`}
                            </p>
                          </div>
                          <span className="text-xs text-zinc-600 group-hover:text-red-400 transition-colors">点击编辑</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => {
                    setAboutSections([...aboutSections, { title: "新板块", content: "", list: [], muted: false }])
                    setEditingAboutIdx(aboutSections.length)
                  }} className="w-full border-2 border-dashed border-zinc-700 rounded-lg py-3 text-sm text-zinc-500 hover:text-red-400 hover:border-red-900/30 transition-colors">
                    <Plus size={16} className="inline mr-1" /> 添加板块
                  </button>
                </div>
              </div>
            )}

            {/* ===== 更新日志管理 ===== */}
            {activeTab === "changelogs" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">更新日志</h2>
                    <p className="text-zinc-500 text-sm">管理前端展示的版本更新记录</p>
                  </div>
                  {!newLog && !editingLog && (
                    <button onClick={() => { setEditingLog({ id: 0, version: "", changes: "", published_at: new Date().toISOString().split("T")[0] }); setNewLog(true) }}
                      className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors">
                      <Plus size={16} /> 新增日志
                    </button>
                  )}
                </div>

                {/* 编辑表单 */}
                {(newLog || editingLog) && editingLog && (
                  <div className="mb-6 bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">版本号</label>
                        <input type="text" value={editingLog.version} onChange={(e) => setEditingLog({ ...editingLog, version: e.target.value })}
                          className={inputClasses} placeholder="v2.0.0" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">发布日期</label>
                        <input type="date" value={editingLog.published_at} onChange={(e) => setEditingLog({ ...editingLog, published_at: e.target.value })}
                          className={inputClasses} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">更新内容（每行一条）</label>
                      <textarea value={editingLog.changes} onChange={(e) => setEditingLog({ ...editingLog, changes: e.target.value })}
                        rows={6} className={`${inputClasses} resize-none`} placeholder="🎉 新功能上线&#10;🐛 修复了一个bug" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingLog(null); setNewLog(false) }}
                        className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">取消</button>
                      <button onClick={handleSaveLog} disabled={saving === "log"}
                        className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                        <Save size={14} /> {saving === "log" ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 日志列表 */}
                <div className="space-y-3">
                  {changelogs.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">暂无更新日志，点击上方按钮新增</p>}
                  {changelogs.map((log) => {
                    const items = (() => { try { return JSON.parse(log.changes) } catch { return [log.changes] } })()
                    return (
                      <div key={log.id} className="bg-zinc-800/30 rounded-lg border border-zinc-800 p-4 flex items-start justify-between group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded text-xs border border-red-900/30">{log.version}</span>
                            <span className="text-zinc-500 text-xs">{(() => { try { return new Date(log.published_at).toISOString().split("T")[0] } catch { return String(log.published_at || "") } })()}</span>
                          </div>
                          <ul className="space-y-1">
                            {Array.isArray(items) && items.map((item: string, i: number) => (
                              <li key={i} className="text-zinc-400 text-sm">{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button onClick={() => {
                            setEditingLog({ ...log, changes: Array.isArray(items) ? items.join("\n") : log.changes })
                            setNewLog(false)
                          }} className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDeleteLog(log.id)} className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ===== Prompt 管理 ===== */}
            {activeTab === "prompts" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Prompt 管理</h2>
                    <p className="text-zinc-500 text-sm">管理 AI 生成时使用的提示词模板。变量：{'{keyword}'} {'{domain}'} {'{style}'} {'{wordCount}'}</p>
                  </div>
                  {!newPrompt && !editingPrompt && (
                    <button onClick={() => { setEditingPrompt({ id: 0, name: "", type: "article", domain: "通用", system_prompt: "", user_prompt_template: "", is_active: 1, sort_order: 0 }); setNewPrompt(true) }}
                      className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors">
                      <Plus size={16} /> 新增 Prompt
                    </button>
                  )}
                </div>

                {(newPrompt || editingPrompt) && editingPrompt && (
                  <div className="mb-6 bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">名称</label>
                        <input type="text" value={editingPrompt.name} onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })} className={inputClasses} placeholder="通用文章生成" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">类型</label>
                        <select value={editingPrompt.type} onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value })} className={inputClasses}>
                          <option value="article">文章生成</option>
                          <option value="title">标题生成</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">适用领域</label>
                        <input type="text" value={editingPrompt.domain} onChange={(e) => setEditingPrompt({ ...editingPrompt, domain: e.target.value })} className={inputClasses} placeholder="通用/情感/职场/科技" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">状态</label>
                        <select value={editingPrompt.is_active} onChange={(e) => setEditingPrompt({ ...editingPrompt, is_active: parseInt(e.target.value) })} className={inputClasses}>
                          <option value={1}>启用</option>
                          <option value={0}>禁用</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">排序</label>
                        <input type="number" value={editingPrompt.sort_order} onChange={(e) => setEditingPrompt({ ...editingPrompt, sort_order: parseInt(e.target.value) || 0 })} className={inputClasses} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">System Prompt（角色设定）</label>
                      <textarea value={editingPrompt.system_prompt} onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                        rows={3} className={`${inputClasses} resize-none`} placeholder="你是一个专业的公众号文章写手..." />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">User Prompt 模板（用户输入）= placeholder=支持变量: {'{keyword}'} {'{domain}'} {'{style}'} {'{wordCount}'}</label>
                      <textarea value={editingPrompt.user_prompt_template} onChange={(e) => setEditingPrompt({ ...editingPrompt, user_prompt_template: e.target.value })}
                        rows={4} className={`${inputClasses} resize-none`} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => { setEditingPrompt(null); setNewPrompt(false) }}
                        className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">取消</button>
                      <button type="button" onClick={handleSavePrompt} disabled={saving === "prompt"}
                        className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                        <Save size={14} /> {saving === "prompt" ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {prompts.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">暂无 Prompt 模板，点击上方按钮新增</p>}
                  {prompts.map((p) => (
                    <div key={p.id} className="bg-zinc-800/30 rounded-lg border border-zinc-800 p-3 flex items-start justify-between group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded text-xs border border-red-900/30">{p.name}</span>
                          <span className="text-xs text-zinc-600">{p.type === "article" ? "文章" : "标题"}</span>
                          <span className="text-xs text-zinc-600">| {p.domain}</span>
                          {!p.is_active && <span className="text-xs text-yellow-600">已禁用</span>}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{p.system_prompt.slice(0, 60)}...</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                        <button type="button" onClick={() => { setEditingPrompt(p); setNewPrompt(false) }}
                          className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors">编辑</button>
                        <button type="button" onClick={() => handleDeletePrompt(p.id)}
                          className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== AI 模型管理 ===== */}
            {activeTab === "models" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">AI 模型管理</h2>
                    <p className="text-zinc-500 text-sm">管理可用的 AI 大模型。设置关键词触发可实现自动路由。</p>
                  </div>
                  {!newModel && !editingModel && (
                    <button onClick={() => { setEditingModel({ id: 0, name: "", provider: "deepseek", api_key: "", base_url: "", model: "", max_tokens: 4096, temperature: 0.7, is_active: 1, keyword_triggers: "", sort_order: 0 }); setNewModel(true) }}
                      className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors">
                      <Plus size={16} /> 新增模型
                    </button>
                  )}
                </div>

                {(newModel || editingModel) && editingModel && (
                  <div className="mb-6 bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">显示名称</label>
                        <input type="text" value={editingModel.name} onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })} className={inputClasses} placeholder="DeepSeek V3" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">提供商</label>
                        <select value={editingModel.provider} onChange={(e) => setEditingModel({ ...editingModel, provider: e.target.value })} className={inputClasses} title="AI提供商">
                          <option value="deepseek">DeepSeek</option>
                          <option value="openai">OpenAI</option>
                          <option value="claude">Claude</option>
                          <option value="custom">自定义</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">模型标识</label>
                        <input type="text" value={editingModel.model} onChange={(e) => setEditingModel({ ...editingModel, model: e.target.value })} className={inputClasses} placeholder="deepseek-chat" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">API Key</label>
                        <input type="password" value={editingModel.api_key} onChange={(e) => setEditingModel({ ...editingModel, api_key: e.target.value })} className={inputClasses} placeholder="sk-..." />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">API 地址（可选）</label>
                        <input type="text" value={editingModel.base_url} onChange={(e) => setEditingModel({ ...editingModel, base_url: e.target.value })} className={inputClasses} placeholder="留空使用默认地址" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Max Tokens</label>
                        <input type="number" value={editingModel.max_tokens} onChange={(e) => setEditingModel({ ...editingModel, max_tokens: parseInt(e.target.value) || 4096 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Temperature</label>
                        <input type="number" step="0.1" value={editingModel.temperature} onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) || 0.7 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">排序</label>
                        <input type="number" value={editingModel.sort_order} onChange={(e) => setEditingModel({ ...editingModel, sort_order: parseInt(e.target.value) || 0 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">状态</label>
                        <select value={editingModel.is_active} onChange={(e) => setEditingModel({ ...editingModel, is_active: parseInt(e.target.value) })} className={inputClasses} title="模型状态">
                          <option value={1}>启用</option>
                          <option value={0}>禁用</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">触发关键词（每行一个，当用户输入含这些词时自动使用此模型）</label>
                      <textarea
                        value={editingModel.keyword_triggers ? (() => { try { return JSON.parse(editingModel.keyword_triggers).join("\n") } catch { return editingModel.keyword_triggers } })() : ""}
                        onChange={(e) => setEditingModel({ ...editingModel, keyword_triggers: JSON.stringify(e.target.value.split("\n").map(s => s.trim()).filter(Boolean)) })}
                        rows={3} className={`${inputClasses} resize-none`} placeholder="技术&#10;编程&#10;AI" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => { setEditingModel(null); setNewModel(false) }}
                        className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">取消</button>
                      <button type="button" onClick={handleSaveModel} disabled={saving === "model"}
                        className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                        <Save size={14} /> {saving === "model" ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {models.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">暂无模型，点击上方按钮新增</p>}
                  {models.map((m) => (
                    <div key={m.id} className="bg-zinc-800/30 rounded-lg border border-zinc-800 p-3 flex items-start justify-between group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded text-xs border border-red-900/30">{m.name}</span>
                          <span className="text-xs text-zinc-600">{m.provider}</span>
                          <span className="text-xs text-zinc-600">| {m.model}</span>
                          {!m.is_active && <span className="text-xs text-yellow-600">已禁用</span>}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {m.api_key ? `密钥: ${m.api_key.slice(0, 6)}***` : "使用环境变量密钥"}
                          {m.keyword_triggers && ` | 触发词: ${(() => { try { return JSON.parse(m.keyword_triggers).join(", ") } catch { return m.keyword_triggers } })()}`}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                        <button type="button" onClick={() => { setEditingModel(m); setNewModel(false) }}
                          className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors">编辑</button>
                        <button type="button" onClick={() => handleDeleteModel(m.id)}
                          className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== 用户列表 ===== */}
            {activeTab === "users" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">用户列表</h2>
                    <p className="text-zinc-500 text-sm">管理所有注册用户，查看使用统计</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                        placeholder="搜索邮箱或昵称..."
                        className="w-52 bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <span className="text-xs text-zinc-500">共 {userTotal} 人</span>
                  </div>
                </div>

                {userLoading ? (
                  <div className="text-center py-12 text-zinc-500">加载中...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">暂无注册用户</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="text-left py-2 px-2 font-medium">ID</th>
                            <th className="text-left py-2 px-2 font-medium">邮箱</th>
                            <th className="text-left py-2 px-2 font-medium">昵称</th>
                            <th className="text-center py-2 px-2 font-medium">验证</th>
                            <th className="text-center py-2 px-2 font-medium">生成</th>
                            <th className="text-center py-2 px-2 font-medium">购买额度</th>
                            <th className="text-center py-2 px-2 font-medium">已用</th>
                            <th className="text-left py-2 px-2 font-medium">注册时间</th>
                            <th className="text-left py-2 px-2 font-medium">最近登录</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 text-zinc-300">
                              <td className="py-2 px-2 text-zinc-600 text-xs">{u.id}</td>
                              <td className="py-2 px-2 font-mono text-xs">{u.email}</td>
                              <td className="py-2 px-2">{u.nickname || '-'}</td>
                              <td className="py-2 px-2 text-center">
                                {u.email_verified ? (
                                  <span className="text-green-400 text-xs">✓</span>
                                ) : (
                                  <span className="text-yellow-500 text-xs">未验证</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center">{u.total_generations}</td>
                              <td className="py-2 px-2 text-center text-red-400">{u.purchased_credits}</td>
                              <td className="py-2 px-2 text-center">{u.credits_used}</td>
                              <td className="py-2 px-2 text-xs text-zinc-500">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : '-'}
                              </td>
                              <td className="py-2 px-2 text-xs text-zinc-500">
                                {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("zh-CN") : '从未登录'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500">
                          第 {userPage}/{totalPages} 页
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="上一页"
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            disabled={userPage <= 1}
                            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            title="下一页"
                            onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                            disabled={userPage >= totalPages}
                            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===== 站点设置 (通用 + 内容管理 + 广告 + 支付 + SEO) ===== */}
            {activeTab !== "changelogs" && activeTab !== "about" && activeTab !== "prompts" && activeTab !== "models" && activeTab !== "users" && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                <h2 className="text-lg font-bold text-white mb-1">{tabs.find((t) => t.id === activeTab)?.label}</h2>
                <p className="text-zinc-500 text-sm mb-6">
                  {activeTab === "general" && "配置站点名称、欢迎语、公告等内容"}
                  {activeTab === "content" && "编辑前台所有页面内容：Header导航、Footer信息、首页轮播/功能介绍/模板/评价/CTA、教程页、模板详情页等。每个配置项都是 JSON 格式，修改后保存即可实时生效。"}
                  {activeTab === "ads" && "管理侧边栏广告位内容和展示"}
                  {activeTab === "payment" && "配置支付接口、套餐价格等"}
                  {activeTab === "seo" && "配置SEO标题、关键词、描述等"}
                </p>
                <div className="space-y-5">
                  {filteredSettings.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">暂无配置项，请先执行 sql/init.sql</p>}
                  {filteredSettings.map((setting) => (
                    <div key={setting.key} className="border-b border-zinc-800 pb-5 last:border-0">
                      <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                        {setting.description || setting.key}
                        <span className="text-zinc-600 font-normal ml-2 text-xs">({setting.key})</span>
                      </label>
                      {setting.type === "textarea" || setting.type === "richtext" ? (
                        <textarea value={setting.value || ""} onChange={(e) => handleChange(setting.key, e.target.value)} rows={4} className={`${inputClasses} resize-none`} />
                      ) : setting.type === "json" ? (
                        <textarea value={setting.value || ""} onChange={(e) => handleChange(setting.key, e.target.value)} rows={12} className={`${inputClasses} font-mono text-xs resize-y`} />
                      ) : (
                        <input type="text" value={setting.value || ""} onChange={(e) => handleChange(setting.key, e.target.value)} className={inputClasses} />
                      )}
                      <div className="flex justify-end mt-2">
                        <button onClick={() => handleSave(setting)} disabled={saving === setting.key}
                          className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                          {saving === setting.key ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
