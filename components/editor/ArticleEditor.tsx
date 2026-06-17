"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Pencil, Check } from "lucide-react"

interface Props {
  content: string
  onContentChange?: (html: string) => void
}

/** 简单字符串哈希 */
function simpleHash(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

/**
 * 上报编辑行为到服务端（fire-and-forget）
 */
async function trackEdit(originalText: string, editedText: string) {
  const articleHash = simpleHash(originalText.slice(0, 500))
  try {
    await fetch("/api/editor/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalText, editedText, articleHash }),
    })
  } catch { /* 追踪失败不影响编辑保存 */ }
}

export function ArticleEditor({ content, onContentChange }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(content)
  const contentRef = useRef(content)

  // 外部 content 变化时同步 text 状态（非编辑中时）
  useEffect(() => {
    if (content !== contentRef.current && !isEditing) {
      setText(content)
    }
    contentRef.current = content
  }, [content, isEditing])

  const handleSave = useCallback(() => {
    if (text !== content) {
      onContentChange?.(text)
      trackEdit(content, text)
    }
    setIsEditing(false)
  }, [text, content, onContentChange])

  const handleCancel = useCallback(() => {
    setText(content)
    setIsEditing(false)
  }, [content])

  if (!isEditing) {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-zinc-100">📄 生成结果</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">约 {content.length} 字</span>
            <button
              type="button"
              onClick={() => { setText(content); setIsEditing(true) }}
              className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
            >
              <Pencil size={16} />
              开始编辑
            </button>
          </div>
        </div>
        <div className="prose max-w-none whitespace-pre-wrap leading-relaxed text-zinc-200">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 mt-6 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
        <span className="text-xs text-zinc-500 mr-2">编辑中 — 可自由修改正文内容</span>
        <span className="flex-1" />
        <button type="button" onClick={handleCancel}
          className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1 rounded transition-colors">
          取消
        </button>
        <button type="button" onClick={handleSave}
          className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition-colors flex items-center gap-1">
          <Check size={14} />
          完成编辑
        </button>
      </div>

      {/* 编辑区 — textarea 替代 contentEditable+execCommand */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-6 outline-none bg-transparent text-zinc-200 resize-y min-h-[300px] leading-relaxed font-mono text-sm border-0 focus:ring-2 focus:ring-inset focus:ring-red-500/50"
        placeholder="开始编辑文章内容..."
        spellCheck={false}
      />
    </div>
  )
}
