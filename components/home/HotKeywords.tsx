"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Flame, TrendingUp } from "lucide-react"

interface HotItem {
  title: string
  trend?: "rising" | "stable" | "declining"
  potential?: number
}

export function HotKeywords() {
  const [items, setItems] = useState<HotItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/hot-topics")
      .then(r => r.json())
      .then(data => {
        // 建立上升期话题集合
        const risingSet = new Set<string>()
        ;(data.analysis || []).forEach((a: any) => {
          if (a.trend === "rising") risingSet.add(a.topicTitle)
        })
        const analysisMap = new Map<string, { trend: string; potential: number }>()
        ;(data.analysis || []).forEach((a: any) => {
          analysisMap.set(a.topicTitle, { trend: a.trend, potential: a.writingPotential })
        })

        // 取 24 条，上升期话题优先排在前面
        const topics = (data.topics || []) as any[]
        const rising: HotItem[] = []
        const rest: HotItem[] = []
        topics.forEach((t: any) => {
          const isRising = risingSet.has(t.title)
          const meta = analysisMap.get(t.title)
          const item: HotItem = {
            title: t.title,
            trend: meta?.trend as any,
            potential: meta?.potential,
          }
          if (isRising) rising.push(item)
          else rest.push(item)
        })
        setItems([...rising, ...rest].slice(0, 24))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || items.length === 0) return null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} className="text-red-500" />
        <h2 className="text-sm font-bold text-zinc-400">🔥 全网热议 · 写作灵感</h2>
        <span className="text-[10px] text-zinc-600">AI 分析上升趋势 · 点击直接创作</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => {
          const isRising = item.trend === "rising"
          return (
            <Link
              key={item.title}
              href={`/generate?keyword=${encodeURIComponent(item.title)}`}
              className={`rounded-full border transition-all duration-200 ${
                isRising
                  ? "text-base font-bold bg-red-900/40 hover:bg-red-800/60 text-red-300 px-4 py-2 border-red-700/50 hover:border-red-500 shadow-lg shadow-red-900/10"
                  : "text-sm bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-400 px-3 py-1.5 border-zinc-700 hover:border-red-800"
              }`}
            >
              {isRising && <TrendingUp size={14} className="inline mr-1 -mt-0.5" />}
              {item.title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
