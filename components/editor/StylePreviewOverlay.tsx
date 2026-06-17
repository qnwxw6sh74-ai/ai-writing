"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, EyeOff, AlertTriangle, Sparkles } from "lucide-react"

interface ForbiddenPhrase {
  id: number
  phrase: string
  category: string
  severity: "hard" | "soft"
}

interface StyleMeme {
  id?: number
  phrase: string
  context: string
  typicalUsage: string
  usageCount?: number
}

interface Props {
  content: string
}

interface HighlightSegment {
  text: string
  type: "normal" | "forbidden_hard" | "forbidden_soft" | "meme" | "long_sentence" | "short_sentence"
  label?: string
}

/**
 * 风格预览覆盖层 — 对文章全文进行客户端标注
 * - 禁语检测（硬/软）
 * - 模因标记
 * - 句长可视化
 */
export function StylePreviewOverlay({ content }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [forbiddenPhrases, setForbiddenPhrases] = useState<ForbiddenPhrase[]>([])
  const [memes, setMemes] = useState<StyleMeme[]>([])
  const [segments, setSegments] = useState<HighlightSegment[]>([])
  const [stats, setStats] = useState<{ forbidden: number; meme: number; longSentences: number }>({ forbidden: 0, meme: 0, longSentences: 0 })
  const [loaded, setLoaded] = useState(false)

  // 加载禁语库和用户模因
  useEffect(() => {
    if (!enabled) return
    if (loaded) return

    const load = async () => {
      try {
        const [fpRes, styleRes] = await Promise.all([
          fetch("/api/style/forbidden-phrases"),
          fetch("/api/style/profile"),
        ])
        if (fpRes.ok) {
          const data = await fpRes.json()
          setForbiddenPhrases(data.phrases || [])
        }
        if (styleRes.ok) {
          const data = await styleRes.json()
          setMemes(data.memes || [])
        }
      } catch { /* ignore */ }
      setLoaded(true)
    }
    load()
  }, [enabled, loaded])

  // 分析文本生成高亮片段
  const analyze = useCallback(() => {
    if (!enabled || !content) {
      setSegments([])
      return
    }

    // 收集所有匹配位置
    interface Match {
      start: number
      end: number
      type: HighlightSegment["type"]
      label: string
    }
    const matches: Match[] = []

    // 1. 禁语匹配
    for (const fp of forbiddenPhrases) {
      let idx = 0
      while (idx < content.length) {
        const pos = content.indexOf(fp.phrase, idx)
        if (pos === -1) break
        matches.push({
          start: pos,
          end: pos + fp.phrase.length,
          type: fp.severity === "hard" ? "forbidden_hard" : "forbidden_soft",
          label: `禁语: ${fp.phrase}`,
        })
        idx = pos + 1
      }
    }

    // 2. 模因匹配
    for (const meme of memes) {
      let idx = 0
      while (idx < content.length) {
        const pos = content.indexOf(meme.phrase, idx)
        if (pos === -1) break
        // 避免与禁语重叠
        const overlapsForbidden = matches.some(m => m.type.startsWith("forbidden") && pos < m.end && pos + meme.phrase.length > m.start)
        if (!overlapsForbidden) {
          matches.push({
            start: pos,
            end: pos + meme.phrase.length,
            type: "meme",
            label: `模因: ${meme.phrase}`,
          })
        }
        idx = pos + 1
      }
    }

    // 3. 句长分析 — 按中文标点分句
    const sentenceRegex = /[^。！？；\n]+[。！？；\n]?/g
    let sentenceMatch: RegExpExecArray | null
    while ((sentenceMatch = sentenceRegex.exec(content)) !== null) {
      const s = sentenceMatch[0]
      const len = s.replace(/\s/g, "").length
      if (len > 50 && !matches.some(m => m.start >= sentenceMatch!.index && m.start < sentenceMatch!.index + s.length)) {
        matches.push({
          start: sentenceMatch.index,
          end: sentenceMatch.index + s.length,
          type: "long_sentence",
          label: `长句 (${len}字)`,
        })
      } else if (len < 10 && len > 0 && !matches.some(m => m.start >= sentenceMatch!.index && m.start < sentenceMatch!.index + s.length)) {
        matches.push({
          start: sentenceMatch.index,
          end: sentenceMatch.index + s.length,
          type: "short_sentence",
          label: `短句 (${len}字)`,
        })
      }
    }

    // 按位置排序，去重叠（优先级：forbidden_hard > forbidden_soft > meme > long > short）
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      const priority: Record<string, number> = { forbidden_hard: 0, forbidden_soft: 1, meme: 2, long_sentence: 3, short_sentence: 4 }
      return (priority[a.type] ?? 9) - (priority[b.type] ?? 9)
    })

    // 去除重叠
    const filtered: Match[] = []
    for (const m of matches) {
      if (filtered.some(f => m.start < f.end && m.end > f.start)) continue
      filtered.push(m)
    }

    // 构建片段
    const segs: HighlightSegment[] = []
    let cursor = 0
    for (const m of filtered) {
      if (m.start > cursor) {
        segs.push({ text: content.slice(cursor, m.start), type: "normal" })
      }
      segs.push({ text: content.slice(m.start, m.end), type: m.type, label: m.label })
      cursor = m.end
    }
    if (cursor < content.length) {
      segs.push({ text: content.slice(cursor), type: "normal" })
    }

    setSegments(segs)
    setStats({
      forbidden: filtered.filter(m => m.type.startsWith("forbidden")).length,
      meme: filtered.filter(m => m.type === "meme").length,
      longSentences: filtered.filter(m => m.type === "long_sentence").length,
    })
  }, [enabled, content, forbiddenPhrases, memes])

  useEffect(() => {
    analyze()
  }, [analyze])

  // 颜色映射
  const typeStyle: Record<string, string> = {
    forbidden_hard: "bg-red-500/30 text-red-300 border-b-2 border-red-500",
    forbidden_soft: "bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/50",
    meme: "bg-blue-500/20 text-blue-300 border-b border-blue-500/50",
    long_sentence: "border-b-2 border-red-400/50",
    short_sentence: "text-zinc-500",
  }

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(true)}
        className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors border border-zinc-700"
      >
        <Eye size={14} />
        风格标注
      </button>
    )
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 mt-6 overflow-hidden">
      {/* 标注工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <Sparkles size={14} className="text-yellow-400" />
            风格标注预览
          </span>
          {stats.forbidden > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle size={12} />
              {stats.forbidden} 处 AI 味
            </span>
          )}
          {stats.meme > 0 && (
            <span className="text-blue-400">{stats.meme} 处模因</span>
          )}
          {stats.longSentences > 0 && (
            <span className="text-red-300">{stats.longSentences} 处长句</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 图例 */}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">禁语</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">模因</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">长/短句</span>
          <button
            type="button"
            onClick={() => { setEnabled(false); setLoaded(false); setSegments([]) }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-2"
          >
            <EyeOff size={14} />
            关闭标注
          </button>
        </div>
      </div>

      {/* 标注内容 */}
      <div className="p-6 prose max-w-none whitespace-pre-wrap leading-relaxed text-zinc-200">
        {segments.length > 0 ? (
          segments.map((seg, i) => (
            <span
              key={i}
              className={typeStyle[seg.type] || ""}
              title={seg.label}
            >
              {seg.text}
            </span>
          ))
        ) : (
          content
        )}
      </div>
    </div>
  )
}
