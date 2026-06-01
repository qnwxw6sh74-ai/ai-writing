"use client"

import { useState, useRef, useCallback } from "react"
import { Bold, Heading2, Quote, Undo2, Redo2, Pencil } from "lucide-react"

interface Props {
  content: string
  onContentChange?: (html: string) => void
}

export function ArticleEditor({ content, onContentChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const execCmd = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    onContentChange?.(editorRef.current?.innerHTML || "")
  }, [onContentChange])

  const handleInput = () => {
    onContentChange?.(editorRef.current?.innerHTML || "")
  }

  if (!isEditing) {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-zinc-100">📄 生成结果</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">约 {content.length} 字</span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
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
        <button type="button" onClick={() => execCmd("bold")} title="加粗"
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => execCmd("formatBlock", "h2")} title="标题"
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <Heading2 size={16} />
        </button>
        <button type="button" onClick={() => execCmd("formatBlock", "blockquote")} title="引用"
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <Quote size={16} />
        </button>
        <span className="w-px h-5 bg-zinc-700 mx-1" />
        <button type="button" onClick={() => execCmd("undo")} title="撤销"
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <Undo2 size={16} />
        </button>
        <button type="button" onClick={() => execCmd("redo")} title="重做"
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <Redo2 size={16} />
        </button>
        <span className="flex-1" />
        <span className="text-xs text-zinc-600 mr-2">编辑中...</span>
        <button type="button" onClick={() => setIsEditing(false)}
          className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition-colors">
          完成编辑
        </button>
      </div>

      {/* 编辑区 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="p-6 outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/50 min-h-[300px] prose max-w-none leading-relaxed text-zinc-200"
        dangerouslySetInnerHTML={{
          __html: contentToHtml(content),
        }}
        data-editor
      />

      {/* 编辑区的基础样式 */}
      <style jsx>{`
        [data-editor] h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #fff; }
        [data-editor] h2 { font-size: 1.2rem; font-weight: 700; margin: 0.8rem 0 0.4rem; color: #fca5a5; }
        [data-editor] h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.3rem; color: #fecaca; }
        [data-editor] p { margin: 0.5rem 0; }
        [data-editor] strong, [data-editor] b { color: #fca5a5; }
        [data-editor] blockquote { border-left: 3px solid #dc2626; padding-left: 1rem; margin: 0.8rem 0; color: #a1a1aa; font-style: italic; }
        [data-editor]:focus { outline: none; }
      `}</style>
    </div>
  )
}

/** 将 markdown 风格的纯文本转为基础 HTML */
function contentToHtml(content: string): string {
  return content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/<br>\n/g, "<br>")
    .split("\n\n").map(para => {
      const trimmed = para.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("<h") || trimmed.startsWith("<blockquote")) return trimmed
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`
    }).join("\n")
}
