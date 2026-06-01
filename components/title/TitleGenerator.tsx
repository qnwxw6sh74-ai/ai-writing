"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Copy, Check, Sparkles } from "lucide-react"

const domains = ["通用", "情感", "职场", "教育", "科技", "养生", "娱乐", "财经"]

interface CreditsInfo {
  paymentEnabled: boolean
  total: number
  used: number
  remaining: number
}

export function TitleGenerator() {
  const [keyword, setKeyword] = useState("")
  const [domain, setDomain] = useState("通用")
  const [titles, setTitles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [showBuyTip, setShowBuyTip] = useState(false)

  useEffect(() => { fetchCredits() }, [])

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/credits")
      setCredits(await res.json())
    } catch { /* ignore */ }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    // 检查额度
    if (credits?.paymentEnabled && credits.remaining <= 0) {
      setShowBuyTip(true)
      return
    }

    setIsLoading(true)
    setShowBuyTip(false)
    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), domain }),
      })
      const data = await res.json()
      setTitles(data.titles || [])
      // 生成成功后记录使用
      if (data.titles?.length) {
        fetch("/api/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "title" }) })
          .then(() => fetchCredits())
      }
    } catch {
      import("@/lib/mock-ai").then((m) => {
        setTitles(m.generateMockTitles({ keyword: keyword.trim(), domain }))
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const inputClasses = "flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"

  return (
    <div className="max-w-3xl mx-auto">
      {/* 额度显示 */}
      {credits?.paymentEnabled && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-zinc-500">免费额度</span>
          <span className={`text-sm font-bold ${credits.remaining > 0 ? "text-red-400" : "text-zinc-500"}`}>
            {credits.remaining} / {credits.total}
          </span>
        </div>
      )}

      {showBuyTip && (
        <div className="mb-4 bg-red-950/30 border border-red-900/30 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-red-300">🎯 免费额度已用完，购买套餐即可继续使用</span>
          <Link href="/pricing" className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors shrink-0">
            查看套餐
          </Link>
        </div>
      )}

      <form onSubmit={handleGenerate} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入核心关键词，如：中年危机、AI教育..."
            className={inputClasses}
            required
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"
          >
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2 shadow-lg shadow-red-900/20"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Sparkles size={18} />
            )}
            生成标题
          </button>
        </div>
      </form>

      {titles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-lg text-zinc-100">🏷️ 为您生成 {titles.length} 个爆款标题：</h3>
          {titles.map((title, i) => (
            <div
              key={i}
              className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 flex items-center justify-between hover:border-red-900/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl font-extrabold text-red-900 mt-0.5">0{i + 1}</span>
                <p className="text-zinc-200 font-medium">{title}</p>
              </div>
              <button
                onClick={() => handleCopy(title, i)}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0 ml-2"
              >
                {copiedIdx === i ? <Check size={16} className="text-red-400" /> : <Copy size={16} />}
                {copiedIdx === i ? "已复制" : "复制"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
