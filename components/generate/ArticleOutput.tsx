"use client"

import { useState, useRef, useCallback } from "react"
import { Shield, CheckCircle, Loader2, Lock, Copy, Pencil } from "lucide-react"
import { ArticleEditor } from "@/components/editor/ArticleEditor"
import { ExportMenu } from "@/components/editor/ExportMenu"
import { RewriteToolbar } from "@/components/editor/RewriteToolbar"

interface CreditsInfo {
  total: number
  used: number
  remaining: number
  purchasedCredits: number
}

interface Props {
  content: string
  title?: string
  credits?: CreditsInfo | null
  onCreditsChange?: (c: CreditsInfo) => void
}

export function ArticleOutput({ content, title, credits, onCreditsChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  const articleHash = useRef(btoa(unescape(encodeURIComponent(content.slice(0, 100))))).current

  const handleConfirm = async () => {
    setConfirming(true)
    setConfirmError("")

    try {
      const res = await fetch("/api/article/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "未命名文章",
          content,
          wordCount: content.length,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setConfirmError("额度不足，请先购买套餐")
        } else {
          setConfirmError(data.error || "确认失败")
        }
        return
      }

      setConfirmed(true)
      onCreditsChange?.(data.credits)
    } catch {
      setConfirmError("网络错误，请稍后重试")
    } finally {
      setConfirming(false)
    }
  }

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content)
  }

  const handleReplace = useCallback((_oldText: string, newText: string) => {
    // 在编辑器中替换选中文本
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(newText))
    }
  }, [])

  // ====== 未确认：锁定状态 ======
  if (!confirmed) {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 mt-6 overflow-hidden">
        {/* 锁定提示 */}
        <div className="flex items-center justify-between px-4 py-3 bg-red-950/30 border-b border-red-900/20">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <Lock size={14} />
            <span>内容已锁定 — 确认后即可编辑、复制、导出</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-red-900/20"
          >
            {confirming ? (
              <><Loader2 size={16} className="animate-spin" /> 确认中...</>
            ) : (
              <><CheckCircle size={16} /> 确认文章 · 扣除1次</>
            )}
          </button>
        </div>

        {confirmError && (
          <div className="px-4 py-2 bg-red-950/20 text-sm text-red-400 text-center">
            {confirmError}
          </div>
        )}

        {/* 锁定内容区 — 可阅读，但不可选中/复制/右键 */}
        <div
          className="p-6 select-none pointer-events-none"
          style={{ userSelect: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="prose max-w-none whitespace-pre-wrap leading-relaxed text-zinc-300">
            {content}
          </div>
        </div>

        {/* 字数统计 */}
        <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-zinc-600">
          <span>约 {content.length} 字</span>
          <span>🔒 未确认不扣次数</span>
        </div>
      </div>
    )
  }

  // ====== 已确认：正常状态 ======
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mt-6 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-950/50 px-2 py-1 rounded-full">
            <CheckCircle size={12} />
            已确认
          </span>
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
          >
            <Copy size={12} />
            一键复制
          </button>
        </div>
        <ExportMenu content={content} editorRef={editorRef} />
      </div>

      <div ref={editorRef} className="relative">
        <ArticleEditor content={content} />
        <RewriteToolbar
          containerRef={editorRef}
          articleHash={articleHash}
          onReplace={handleReplace}
        />
      </div>
    </div>
  )
}
