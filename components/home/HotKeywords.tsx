"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Flame } from "lucide-react"

export function HotKeywords() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/hot-topics")
      .then(r => r.json())
      .then(data => {
        const titles = (data.topics || []).slice(0, 12).map((t: any) => t.title)
        setKeywords(titles)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || keywords.length === 0) return null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} className="text-red-500" />
        <h2 className="text-sm font-bold text-zinc-400">🔥 全网热议 · 写作灵感</h2>
        <span className="text-[10px] text-zinc-600">点击直接创作</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <Link
            key={kw}
            href={`/generate?keyword=${encodeURIComponent(kw)}`}
            className="text-xs bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-400 px-3 py-1.5 rounded-full border border-zinc-700 hover:border-red-800 transition-all duration-200"
          >
            {kw}
          </Link>
        ))}
      </div>
    </div>
  )
}
