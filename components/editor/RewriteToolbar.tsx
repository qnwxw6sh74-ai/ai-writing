"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { getUserErrorMessage } from "@/lib/fetch-utils"

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>
  articleHash: string
  onReplace: (oldText: string, newText: string) => void
}

const ACTIONS = [
  { key: "expand", label: "扩写", desc: "增加细节与论述" },
  { key: "abbreviate", label: "缩写", desc: "精炼核心观点" },
  { key: "regenerate", label: "换一换", desc: "换种表达方式" },
] as const

export function RewriteToolbar({ containerRef, articleHash, onReplace }: Props) {
  const [selectedText, setSelectedText] = useState("")
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState("")
  const [remaining, setRemaining] = useState(5)
  const [error, setError] = useState("")
  const toolbarRef = useRef<HTMLDivElement>(null)

  const hide = useCallback(() => {
    setPosition(null)
    setSelectedText("")
    setError("")
  }, [])

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        hide()
        return
      }

      const container = containerRef.current
      if (!container) return

      // 确保选中内容在我们的容器内
      const range = sel.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) return

      const text = sel.toString().trim()
      if (text.length < 2) { hide(); return }

      // 计算工具栏位置（移动端边界保护）
      const rect = range.getBoundingClientRect()
      const toolbarW = 280 // 预估工具栏宽度
      let x = rect.left + rect.width / 2
      const minX = toolbarW / 2 + 8
      const maxX = window.innerWidth - toolbarW / 2 - 8
      x = Math.max(minX, Math.min(maxX, x))

      setSelectedText(text)
      setPosition({
        x,
        y: Math.max(rect.top - 12, 60), // 不超出屏幕顶部（留 header 空间）
      })
    }

    document.addEventListener("selectionchange", handleSelection)
    return () => document.removeEventListener("selectionchange", handleSelection)
  }, [containerRef, hide])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // 不立即关闭，因为可能是点击工具栏按钮
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleAction = async (action: string) => {
    if (!selectedText || loading) return
    setLoading(action)
    setError("")

    try {
      const res = await fetch("/api/article/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, action, articleHash }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "改写失败")
        return
      }

      setRemaining(data.remaining)
      onReplace(selectedText, data.result)
      hide()

      // 清除选中
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      setError(getUserErrorMessage(e, "服务器异常，请稍后重试"))
    } finally {
      setLoading("")
    }
  }

  if (!position || !selectedText) return null

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 100,
      }}
      className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl p-1.5 flex items-center gap-1"
    >
      {ACTIONS.map(({ key, label, desc }) => (
        <button
          key={key}
          type="button"
          disabled={loading !== "" || remaining <= 0}
          onClick={() => handleAction(key)}
          title={desc}
          className="flex items-center gap-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 disabled:opacity-40 text-zinc-200 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
        >
          {loading === key ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} className="text-yellow-400" />
          )}
          {label}
        </button>
      ))}
      <span className="text-xs text-zinc-500 px-1">
        {remaining}/5
      </span>
      {error && (
        <span className="text-xs text-red-400 px-1 animate-pulse">
          {error}
        </span>
      )}
    </div>
  )
}
