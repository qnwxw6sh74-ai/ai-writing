"use client"

import { useState } from "react"
import { Loader2, Check, Edit3, ArrowRight, RefreshCw } from "lucide-react"

interface OutlineSection {
  heading: string
  estimatedWords: number
  keyPoints: string
  orderIndex: number
  content?: string
}

interface OutlineData {
  outlineId: number
  title: string
  sections: OutlineSection[]
}

interface Props {
  outline: OutlineData
  onGenerated: (fullArticle: string, title: string) => void
  onError: (msg: string) => void
  onBack: () => void
}

type Phase = "edit" | "generating" | "done"

export function OutlineEditor({ outline: initialOutline, onGenerated, onError, onBack }: Props) {
  const [outline, setOutline] = useState<OutlineData>(initialOutline)
  const [phase, setPhase] = useState<Phase>("edit")
  const [currentSection, setCurrentSection] = useState(-1)
  const [generatedSections, setGeneratedSections] = useState<Record<number, string>>({})
  const [error, setError] = useState("")

  // 更新标题
  const updateTitle = (title: string) => {
    setOutline(prev => ({ ...prev, title }))
  }

  // 更新小标题
  const updateHeading = (idx: number, heading: string) => {
    setOutline(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === idx ? { ...s, heading } : s),
    }))
  }

  // 逐个生成段落
  const startGenerating = async () => {
    setPhase("generating")
    setError("")
    const contents: Record<number, string> = {}

    for (let i = 0; i < outline.sections.length; i++) {
      setCurrentSection(i)
      try {
        const res = await fetch("/api/generate/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outlineId: outline.outlineId, sectionIndex: i }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "生成失败")
        contents[i] = data.content
        setGeneratedSections({ ...contents })
      } catch (e: any) {
        setError(`第${i + 1}段生成失败: ${e.message}`)
        setPhase("edit")
        return
      }
    }

    // 全部生成完 → 组装
    setCurrentSection(-1)
    try {
      const res = await fetch("/api/generate/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineId: outline.outlineId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "组装失败")
      setPhase("done")
      onGenerated(data.fullArticle, outline.title)
    } catch (e: any) {
      setError(`文章组装失败: ${e.message}`)
      setPhase("edit")
    }
  }

  // 重新生成某一段
  const regenerateSection = async (idx: number) => {
    setCurrentSection(idx)
    setError("")
    try {
      const res = await fetch("/api/generate/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineId: outline.outlineId, sectionIndex: idx }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      const newContents = { ...generatedSections, [idx]: data.content }
      setGeneratedSections(newContents)
    } catch (e: any) {
      setError(`重新生成失败: ${e.message}`)
    }
    setCurrentSection(-1)
  }

  const totalSections = outline.sections.length
  const completedSections = Object.keys(generatedSections).length

  if (phase === "generating" || phase === "done") {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">📝 {outline.title}</h2>
          {phase === "generating" && (
            <span className="text-sm text-zinc-400">
              正在生成 {completedSections + 1}/{totalSections} 段
            </span>
          )}
          {phase === "done" && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <Check size={16} /> 全部生成完成
            </span>
          )}
        </div>

        {/* 进度条 */}
        {phase === "generating" && (
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedSections / totalSections) * 100}%` }}
            />
          </div>
        )}

        {/* 段落列表 */}
        <div className="space-y-2">
          {outline.sections.map((s, i) => {
            const isCurrent = i === currentSection
            const content = generatedSections[i]
            return (
              <div
                key={i}
                className={`rounded-lg p-3 border transition-colors ${
                  content
                    ? "bg-zinc-800/50 border-green-900/30"
                    : isCurrent
                    ? "bg-red-950/20 border-red-900/50 animate-pulse"
                    : "bg-zinc-800/30 border-zinc-700/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {content ? (
                    <Check size={16} className="text-green-500 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="text-red-400 animate-spin shrink-0" />
                  ) : (
                    <span className="text-xs text-zinc-600 w-4 shrink-0">{i + 1}</span>
                  )}
                  <span className={`text-sm ${content ? "text-zinc-300" : isCurrent ? "text-red-300" : "text-zinc-500"}`}>
                    {s.heading}
                  </span>
                  <span className="text-xs text-zinc-600">(~{s.estimatedWords}字)</span>
                  {content && phase === "done" && (
                    <button
                      type="button"
                      onClick={() => regenerateSection(i)}
                      className="ml-auto text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> 重写
                    </button>
                  )}
                </div>
                {content && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{content.slice(0, 200)}...</p>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {phase === "edit" && (
          <button
            type="button"
            onClick={onBack}
            className="w-full bg-zinc-700 text-white py-2.5 rounded-lg hover:bg-zinc-600 transition-colors"
          >
            ← 返回修改
          </button>
        )}
      </div>
    )
  }

  // 编辑模式
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">📋 文章大纲</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          返回重来
        </button>
      </div>

      {/* 编辑标题 */}
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">文章标题</label>
        <input
          type="text"
          value={outline.title}
          onChange={e => updateTitle(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"
        />
      </div>

      {/* 编辑段落 */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 block">段落大纲（可编辑小标题）</label>
        {outline.sections.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 w-5 shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={s.heading}
              onChange={e => updateHeading(i, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
            <span className="text-xs text-zinc-600 shrink-0">~{s.estimatedWords}字</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      {/* 确认按钮 */}
      <button
        type="button"
        onClick={startGenerating}
        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
      >
        <ArrowRight size={18} />
        确认大纲，开始逐段生成
      </button>

      <p className="text-center text-xs text-zinc-600">
        确认后将按大纲逐段生成文章，共 {outline.sections.length} 段，每段独立 AI 调用确保质量
      </p>
    </div>
  )
}
