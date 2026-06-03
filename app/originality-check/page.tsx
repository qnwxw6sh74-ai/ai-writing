"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, AlertTriangle, Loader2, Sparkles, TrendingUp } from "lucide-react"

interface CheckResult {
  score: number
  wordCount: number
  details: {
    uniqueWordRatio: number
    sentenceVariety: number
    repeatedPhrases: number
    readabilityScore: number
  }
  suggestions: string[]
  analysis?: string
  similarPatterns?: string
  method: "local" | "local+ai"
  credits?: { remaining: number; total: number }
}

export default function OriginalityCheckPage() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<CheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState("")

  const handleCheck = async () => {
    if (!text.trim()) return
    setIsChecking(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/originality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setError("请先登录后使用原创检测功能")
        } else if (res.status === 402) {
          setError("额度不足，请先购买套餐")
        } else {
          setError(data.error || "检测失败")
        }
        return
      }

      setResult(data)
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsChecking(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 80 ? "#22c55e" : s >= 60 ? "#eab308" : "#ef4444"
  const scoreLabel = (s: number) =>
    s >= 80 ? "原创度良好" : s >= 60 ? "原创度一般" : "原创度较低"

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🛡️ 原创检测</h1>
          <p className="text-zinc-400 mt-1">
            基于本地算法 + AI 大模型双层分析，评估文章原创度
          </p>
        </div>

        {/* 输入区 */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请粘贴您要检测的文章内容（至少50字）..."
            rows={10}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              已输入 {text.length} 字{text.length < 50 && text.length > 0 && "（至少50字）"}
            </span>
            <button
              onClick={handleCheck}
              disabled={isChecking || text.trim().length < 50}
              className="bg-red-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              {isChecking ? (
                <><Loader2 size={18} className="animate-spin" /> 检测中...</>
              ) : (
                <><Shield size={18} /> 开始检测</>
              )}
            </button>
          </div>
        </div>

        {/* 错误 */}
        {error && (
          <div className="mt-6 bg-red-950/30 border border-red-900/30 rounded-xl p-4 text-sm text-red-300 text-center">
            {error}
            {error.includes("登录") && (
              <div className="mt-2">
                <Link href="/login?redirect=/originality-check" className="text-red-400 underline">
                  去登录
                </Link>
              </div>
            )}
            {error.includes("额度") && (
              <div className="mt-2">
                <Link href="/pricing" className="text-red-400 underline">
                  去购买
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 结果 */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* 综合评分 */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 text-center">
              <div
                className="text-6xl font-extrabold mb-2"
                style={{ color: scoreColor(result.score) }}
              >
                {result.score}<span className="text-2xl">%</span>
              </div>
              <p className="text-zinc-300 font-medium">{scoreLabel(result.score)}</p>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-zinc-500">
                <span>检测字数：{result.wordCount}</span>
                <span className="flex items-center gap-1">
                  方法：{result.method === "local+ai" ? (
                    <><Sparkles size={12} className="text-yellow-400" /> 本地+AI</>
                  ) : (
                    "本地分析"
                  )}
                </span>
                {result.credits && (
                  <span>剩余额度：{result.credits.remaining} 次</span>
                )}
              </div>
            </div>

            {/* 四维指标 */}
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-xl font-bold text-red-400">{result.details.uniqueWordRatio}%</div>
                <p className="text-xs text-zinc-500 mt-1">词汇多样性</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-xl font-bold text-yellow-400">{result.details.sentenceVariety}%</div>
                <p className="text-xs text-zinc-500 mt-1">句式变化</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-xl font-bold text-blue-400">{result.details.repeatedPhrases}</div>
                <p className="text-xs text-zinc-500 mt-1">重复词组</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-xl font-bold text-green-400">{result.details.readabilityScore}分</div>
                <p className="text-xs text-zinc-500 mt-1">可读性</p>
              </div>
            </div>

            {/* AI 分析 */}
            {result.analysis && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                <h3 className="font-bold text-zinc-200 mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400" />
                  AI 深度分析
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.analysis}</p>
                {result.similarPatterns && result.similarPatterns !== "未检测到明显套路" && (
                  <div className="mt-3 bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">检测到的套路/模板：</p>
                    <p className="text-sm text-yellow-300">{result.similarPatterns}</p>
                  </div>
                )}
              </div>
            )}

            {/* 优化建议 */}
            {result.suggestions.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                <h3 className="font-bold text-zinc-200 mb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-red-400" />
                  优化建议
                </h3>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-red-500 mt-0.5 shrink-0">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
