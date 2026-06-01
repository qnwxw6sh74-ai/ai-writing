"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Shield } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        router.push("/admin/dashboard")
      } else {
        const data = await res.json()
        setError(data.error || "登录失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 w-full max-w-md glow-red-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-950 rounded-full mb-4 border border-red-900/30">
            <Shield size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">管理后台</h1>
          <p className="text-zinc-500 text-sm mt-1">请输入管理员账号密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1">用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none" required />
          </div>
          {error && <div className="bg-red-950/50 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900/30">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 shadow-lg shadow-red-900/20">
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  )
}
