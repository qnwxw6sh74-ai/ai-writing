"use client"

import { useState, useRef, useCallback } from "react"
import { Loader2, Check, ArrowRight, RefreshCw, ChevronRight } from "lucide-react"

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

type Phase = "edit" | "generating" | "reviewing" | "assembling" | "done"

/**
 * fire-and-forget 追踪上报
 */
function trackSectionAction(params: {
  originalText: string
  editedText: string
  sectionIndex: number
  outlineId: number
  actionType: "ai_generate" | "confirm" | "rewrite" | "edit"
  articleHash?: string
}) {
  const hash = params.articleHash || Math.abs(
    params.originalText.split("").reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)
  ).toString(16)
  fetch("/api/editor/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originalText: params.originalText,
      editedText: params.editedText,
      articleHash: hash,
      sectionIndex: params.sectionIndex,
      outlineId: params.outlineId,
      actionType: params.actionType,
    }),
  }).catch(() => { /* fire-and-forget */ })
}

export function OutlineEditor({ outline: initialOutline, onGenerated, onError, onBack }: Props) {
  const [outline, setOutline] = useState<OutlineData>(initialOutline)
  const [phase, setPhase] = useState<Phase>("edit")
  const [currentSectionIdx, setCurrentSectionIdx] = useState(-1)
  const [currentContent, setCurrentContent] = useState("") // 刚生成或编辑中的段落内容
  const [aiOriginalContent, setAiOriginalContent] = useState("") // AI 原始生成内容（用于追踪对比）
  const [generatedSections, setGeneratedSections] = useState<Record<number, string>>({})
  const [confirmedSections, setConfirmedSections] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")
  const generatingRef = useRef(false) // 防重复调用锁

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

  // ====== 生成单个段落 ======
  const generateSection = useCallback(async (idx: number) => {
    if (generatingRef.current) return
    generatingRef.current = true
    setPhase("generating")
    setCurrentSectionIdx(idx)
    setError("")

    try {
      const res = await fetch("/api/generate/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineId: outline.outlineId, sectionIndex: idx }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")

      // 更新已生成内容
      setGeneratedSections(prev => ({ ...prev, [idx]: data.content }))
      setCurrentContent(data.content)
      setAiOriginalContent(data.content)

      // 追踪：AI 生成完成
      trackSectionAction({
        originalText: "",
        editedText: data.content,
        sectionIndex: idx,
        outlineId: outline.outlineId,
        actionType: "ai_generate",
      })

      setPhase("reviewing") // ← 暂停等用户操作
    } catch (e: any) {
      setError(`第${idx + 1}段生成失败: ${e.message}`)
      // 如果已有生成的内容则回到 reviewing
      if (generatedSections[idx]) {
        setCurrentContent(generatedSections[idx])
        setPhase("reviewing")
      } else {
        setPhase("edit")
      }
    } finally {
      generatingRef.current = false
    }
  }, [outline.outlineId, generatedSections])

  // ====== 确认当前段，继续下一段 ======
  const confirmAndAdvance = useCallback(async () => {
    const idx = currentSectionIdx

    // 追踪：确认（可能包含用户编辑）
    const wasEdited = currentContent !== aiOriginalContent
    trackSectionAction({
      originalText: wasEdited ? aiOriginalContent : "",
      editedText: currentContent,
      sectionIndex: idx,
      outlineId: outline.outlineId,
      actionType: "confirm",
    })

    // 如果用户编辑过内容，更新到 generatedSections
    if (wasEdited) {
      setGeneratedSections(prev => ({ ...prev, [idx]: currentContent }))
    }

    const newConfirmed = new Set(confirmedSections)
    newConfirmed.add(idx)
    setConfirmedSections(newConfirmed)

    // 检查是否全部确认
    const nextIdx = idx + 1
    if (nextIdx >= outline.sections.length) {
      // 全部确认 → 组装
      await assembleAndFinish()
    } else {
      // 继续下一段
      await generateSection(nextIdx)
    }
  }, [currentSectionIdx, currentContent, aiOriginalContent, confirmedSections, outline])

  // ====== 重写当前段 ======
  const rewriteSection = useCallback(async () => {
    const idx = currentSectionIdx

    // 追踪：重写（记录旧内容）
    trackSectionAction({
      originalText: currentContent,
      editedText: "",
      sectionIndex: idx,
      outlineId: outline.outlineId,
      actionType: "rewrite",
    })

    await generateSection(idx)
  }, [currentSectionIdx, currentContent, outline.outlineId, generateSection])

  // ====== 组装全文 ======
  const assembleAndFinish = useCallback(async () => {
    const lastIdx = outline.sections.length - 1
    setPhase("assembling")
    setCurrentSectionIdx(-1)
    setError("")

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
      // 回退到最后一个段落的 reviewing
      setCurrentSectionIdx(lastIdx)
      setCurrentContent(generatedSections[lastIdx] || "")
      setPhase("reviewing")
    }
  }, [outline.outlineId, outline.title, outline.sections.length, generatedSections, onGenerated])

  // ====== 开始生成（从第一段） ======
  const startGenerating = useCallback(async () => {
    setConfirmedSections(new Set())
    setGeneratedSections({})
    await generateSection(0)
  }, [generateSection])

  // ====== 编辑当前段内容 ======
  const handleContentEdit = (text: string) => {
    setCurrentContent(text)
  }

  const totalSections = outline.sections.length
  const confirmedCount = confirmedSections.size

  // ==================== REVIEWING 阶段 UI ====================
  if (phase === "reviewing" && currentSectionIdx >= 0) {
    const section = outline.sections[currentSectionIdx]
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        {/* 顶部信息 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📝 第 {currentSectionIdx + 1}/{totalSections} 段
          </h2>
          <span className="text-sm text-zinc-400">
            已确认 {confirmedCount}/{totalSections} 段
          </span>
        </div>

        {/* 小标题 */}
        <div className="bg-zinc-800/50 rounded-lg px-4 py-2.5">
          <span className="text-xs text-zinc-500">段落标题</span>
          <p className="text-sm text-zinc-200 font-medium">{section.heading}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>预计 ~{section.estimatedWords} 字</span>
            {section.keyPoints && <span>要点: {section.keyPoints}</span>}
          </div>
        </div>

        {/* 内容编辑区 */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">
            段落内容（可编辑修改后确认）
          </label>
          <textarea
            value={currentContent}
            onChange={e => handleContentEdit(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 leading-relaxed resize-y min-h-[200px] focus:ring-2 focus:ring-red-500/50 outline-none font-mono"
            placeholder="段落内容..."
          />
          {currentContent !== aiOriginalContent && (
            <p className="text-xs text-yellow-400 mt-1">✏️ 已手动编辑，确认后将保存修改版本</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rewriteSection}
            disabled={generatingRef.current}
            className="flex items-center gap-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
            重写本段
          </button>
          <button
            type="button"
            onClick={confirmAndAdvance}
            disabled={generatingRef.current || !currentContent.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check size={16} />
            {currentSectionIdx + 1 >= totalSections ? "确认并组装全文" : "确认，继续下一段"}
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 进度条 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>进度</span>
            <span>{confirmedCount}/{totalSections} 段已确认</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(confirmedCount / totalSections) * 100}%` }}
            />
          </div>
          {/* 段落指示器 */}
          <div className="flex gap-1 mt-1">
            {outline.sections.map((s, i) => {
              let bg = "bg-zinc-700"
              if (confirmedSections.has(i)) bg = "bg-green-600"
              else if (i === currentSectionIdx) bg = "bg-red-500 animate-pulse"
              else if (generatedSections[i]) bg = "bg-yellow-600"
              return (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${bg} transition-colors`}
                  title={`${s.heading}${confirmedSections.has(i) ? " ✓" : generatedSections[i] ? " (待确认)" : ""}`}
                />
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ==================== GENERATING 阶段 UI ====================
  if (phase === "generating" && currentSectionIdx >= 0) {
    const section = outline.sections[currentSectionIdx]
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center space-y-4">
        <Loader2 size={36} className="text-red-400 animate-spin mx-auto" />
        <div>
          <p className="text-zinc-200 font-medium">
            正在生成第 {currentSectionIdx + 1}/{totalSections} 段
          </p>
          <p className="text-zinc-500 text-sm mt-1">「{section.heading}」</p>
        </div>
        <div className="w-full max-w-xs mx-auto bg-zinc-800 rounded-full h-2">
          <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
        <p className="text-xs text-zinc-600">AI 正在创作中，请稍候...</p>
      </div>
    )
  }

  // ==================== ASSEMBLING 阶段 UI ====================
  if (phase === "assembling") {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center space-y-4">
        <Loader2 size={36} className="text-green-400 animate-spin mx-auto" />
        <p className="text-zinc-200 font-medium">正在组装全文...</p>
        <p className="text-zinc-500 text-sm">
          {confirmedCount}/{totalSections} 段已确认，正在拼接为完整文章
        </p>
      </div>
    )
  }

  // ==================== DONE 阶段 UI ====================
  if (phase === "done") {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">📝 {outline.title}</h2>
          <span className="text-sm text-green-400 flex items-center gap-1">
            <Check size={16} /> 全部生成完成
          </span>
        </div>

        <div className="space-y-2">
          {outline.sections.map((s, i) => {
            const content = generatedSections[i]
            const isConfirmed = confirmedSections.has(i)
            return (
              <div
                key={i}
                className={`rounded-lg p-3 border ${isConfirmed ? "bg-zinc-800/50 border-green-900/30" : "bg-zinc-800/30 border-zinc-700/50"}`}
              >
                <div className="flex items-center gap-2">
                  <Check size={16} className={isConfirmed ? "text-green-500" : "text-zinc-600"} />
                  <span className={`text-sm ${isConfirmed ? "text-zinc-300" : "text-zinc-500"}`}>
                    {s.heading}
                  </span>
                  <span className="text-xs text-zinc-600">(~{s.estimatedWords}字)</span>
                </div>
                {content && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{content.slice(0, 200)}...</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ==================== EDIT 阶段（默认） ====================
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
        确认后将按大纲逐段生成文章，共 {outline.sections.length} 段。每段生成后可审核、编辑或重写。
      </p>
    </div>
  )
}
