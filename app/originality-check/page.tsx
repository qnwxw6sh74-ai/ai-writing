"use client"

import { useState } from "react"
import { Shield, AlertTriangle } from "lucide-react"

export default function OriginalityCheckPage() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<{
    score: number; wordCount: number; suggestions: string[]
    details: { uniqueSentences: number; repeatedPhrases: number; readabilityScore: number }
  } | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const handleCheck = async () => {
    if (!text.trim()) return
    setIsChecking(true)
    setTimeout(() => {
      import("@/lib/mock-ai").then((m) => setResult(m.mockOriginalityCheck(text)))
      setIsChecking(false)
    }, 1500)
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🛡️ 原创检测</h1>
          <p className="text-zinc-400 mt-1">检测文章原创度，提升内容质量和收录率</p>
        </div>

        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请粘贴您要检测的文章内容（建议至少200字）..."
            rows={10}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">已输入 {text.length} 字</span>
            <button
              onClick={handleCheck}
              disabled={isChecking || !text.trim()}
              className="bg-red-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              {isChecking ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  检测中...
                </>
              ) : (
                <><Shield size={18} /> 开始检测</>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 text-center">
              <div className="text-5xl font-extrabold mb-2" style={{ color: result.score >= 80 ? "#22c55e" : result.score >= 60 ? "#eab308" : "#ef4444" }}>
                {result.score}%
              </div>
              <p className="text-zinc-400">
                {result.score >= 80 ? "原创度良好" : result.score >= 60 ? "原创度一般" : "原创度较低"}
              </p>
              <p className="text-xs text-zinc-600 mt-1">检测字数：{result.wordCount}</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{result.details.uniqueSentences}%</div>
                <p className="text-xs text-zinc-500 mt-1">独特句子占比</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{result.details.repeatedPhrases}</div>
                <p className="text-xs text-zinc-500 mt-1">重复词组数</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{result.details.readabilityScore}分</div>
                <p className="text-xs text-zinc-500 mt-1">可读性评分</p>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h3 className="font-bold text-zinc-200 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-yellow-500" />
                优化建议
              </h3>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="text-red-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
