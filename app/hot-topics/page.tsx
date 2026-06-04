"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Flame, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, Eye } from "lucide-react"

interface HotTopic {
  id: string
  title: string
  rank: number
  hotScore: number
  source: "tencent" | "weibo" | "douyin"
}

interface HotAnalysis {
  topicTitle: string
  trend: "rising" | "stable" | "declining"
  trendLabel: string
  writingPotential: number
  suggestions: string[]
}

const quickLinks = [
  { emoji: "✍️", label: "爆文生成", href: "/generate" },
  { emoji: "🏷️", label: "爆文标题生成", href: "/title-generator" },
  { emoji: "🔥", label: "热点选题", href: "/hot-topics", active: true },
  { emoji: "🖼️", label: "图片生成", href: "/image-generator" },
  { emoji: "🛡️", label: "原创检测", href: "/originality-check" },
  { emoji: "🎨", label: "风格实验室", href: "/style-lab" },
  { emoji: "📚", label: "使用教程", href: "/tutorials" },
]

const sourceLabels: Record<string, { label: string; color: string }> = {
  tencent: { label: "腾讯", color: "bg-blue-950/50 text-blue-400" },
  weibo: { label: "微博", color: "bg-red-950/50 text-red-400" },
  douyin: { label: "抖音", color: "bg-cyan-950/50 text-cyan-400" },
}

const trendIcons: Record<string, React.ReactNode> = {
  rising: <TrendingUp size={14} className="text-red-400" />,
  stable: <Minus size={14} className="text-zinc-400" />,
  declining: <TrendingDown size={14} className="text-green-400" />,
}

export default function HotTopicsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<HotTopic[]>([])
  const [analysis, setAnalysis] = useState<HotAnalysis[] | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/hot-topics")
      if (!res.ok) throw new Error("请求失败")
      const data = await res.json()
      setTopics(data.topics || [])
      setAnalysis(data.analysis)
      setSources(data.sources || [])
      setErrors(data.errors || [])
    } catch {
      setError("获取热点失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // 查找话题对应的分析
  const findAnalysis = (title: string) =>
    analysis?.find(a => title.includes(a.topicTitle) || a.topicTitle.includes(title))

  // 跳转生成页
  const goGenerate = (keyword: string) => {
    router.push(`/generate?keyword=${encodeURIComponent(keyword)}`)
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            <div className="space-y-2 sticky top-24">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center w-full p-3 text-left rounded-lg transition-all duration-200 border text-sm ${
                    link.active
                      ? "bg-red-950/30 border-red-800 text-red-300"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-red-900/50 hover:text-red-300"
                  }`}
                >
                  <span className="mr-3 text-lg">{link.emoji}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 主内容 */}
          <div className="lg:col-span-5">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Flame size={24} className="text-red-500" /> 热点选题
                  </h1>
                  <p className="text-zinc-400 mt-1">
                    全网实时热点 + AI 趋势分析，找准写作方向
                    {sources.length > 0 && (
                      <span className="ml-2 text-xs text-zinc-600">
                        已覆盖 {sources.map(s => sourceLabels[s]?.label).join(" · ")}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  刷新
                </button>
              </div>

              {errors.length > 0 && (
                <div className="mt-3 bg-yellow-950/20 border border-yellow-900/20 rounded-lg p-2 text-xs text-yellow-500">
                  ⚠ 部分数据源异常：{errors.join(" · ")}
                </div>
              )}
            </div>

            {/* 加载骨架屏 */}
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-800 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                <p className="text-zinc-500 mb-3">{error}</p>
                <button
                  onClick={fetchData}
                  className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500"
                >
                  重试
                </button>
              </div>
            )}

            {/* 热点列表 */}
            {!loading && !error && (
              <div className="space-y-2">
                {topics.map((topic) => {
                  const a = findAnalysis(topic.title)
                  return (
                    <div
                      key={topic.id}
                      className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors group cursor-pointer"
                      onClick={() => goGenerate(topic.title)}
                    >
                      <div className="flex items-start gap-3">
                        {/* 排名 */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          topic.rank <= 3 ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {topic.rank}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 标题行 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-200 group-hover:text-red-400 transition-colors truncate">
                              {topic.title}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceLabels[topic.source]?.color}`}>
                              {sourceLabels[topic.source]?.label}
                            </span>
                          </div>

                          {/* AI 分析行 */}
                          {a && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                {trendIcons[a.trend]}
                                <span className={`${
                                  a.trend === "rising" ? "text-red-400" :
                                  a.trend === "declining" ? "text-green-400" : "text-zinc-500"
                                }`}>
                                  {a.trendLabel} · 写作潜力 {a.writingPotential}/10
                                </span>
                              </div>
                              {a.suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {a.suggestions.map((s, i) => (
                                    <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                      💡 {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 热度 */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono text-zinc-500">
                            {topic.hotScore > 10000
                              ? `${(topic.hotScore / 10000).toFixed(1)}万`
                              : topic.hotScore}
                          </div>
                          <Eye size={12} className="text-zinc-700 ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {topics.length === 0 && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
                    暂无热点数据，请点击刷新
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
