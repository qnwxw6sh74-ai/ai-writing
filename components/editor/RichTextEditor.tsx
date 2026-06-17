"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold, Italic, UnderlineIcon, Heading2, Heading3,
  Quote, List, Undo2, Redo2,
} from "lucide-react"
import { forwardRef, useImperativeHandle } from "react"

export interface RichTextEditorHandle {
  getText: () => string
  getHTML: () => string
  setContent: (html: string) => void
  replaceSelection: (text: string) => void
}

interface Props {
  content: string
  onChange?: (html: string) => void
  editable?: boolean
  className?: string
  placeholder?: string
}

const TOOLBAR_BUTTONS = [
  { key: "bold", icon: Bold, title: "粗体", action: (e: any) => e.chain().focus().toggleBold().run(), isActive: (e: any) => e.isActive("bold") },
  { key: "italic", icon: Italic, title: "斜体", action: (e: any) => e.chain().focus().toggleItalic().run(), isActive: (e: any) => e.isActive("italic") },
  { key: "underline", icon: UnderlineIcon, title: "下划线", action: (e: any) => e.chain().focus().toggleUnderline().run(), isActive: (e: any) => e.isActive("underline") },
  { key: "heading2", icon: Heading2, title: "二级标题", action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e: any) => e.isActive("heading", { level: 2 }) },
  { key: "heading3", icon: Heading3, title: "三级标题", action: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e: any) => e.isActive("heading", { level: 3 }) },
  { key: "blockquote", icon: Quote, title: "引用块", action: (e: any) => e.chain().focus().toggleBlockquote().run(), isActive: (e: any) => e.isActive("blockquote") },
  { key: "bulletList", icon: List, title: "无序列表", action: (e: any) => e.chain().focus().toggleBulletList().run(), isActive: (e: any) => e.isActive("bulletList") },
]

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  function RichTextEditor({ content, onChange, editable = true, className = "", placeholder = "开始编辑文章内容..." }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        Placeholder.configure({ placeholder }),
      ],
      content,
      editable,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
    })

    useImperativeHandle(ref, () => ({
      getText: () => {
        if (!editor) return ""
        return editor.getText()
      },
      getHTML: () => {
        if (!editor) return ""
        return editor.getHTML()
      },
      setContent: (html: string) => {
        editor?.commands.setContent(html)
      },
      replaceSelection: (text: string) => {
        editor?.chain().focus().insertContent(text).run()
      },
    }), [editor])

    if (!editor) {
      return (
        <div className={`bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 ${className}`}>
          <p className="text-zinc-500 text-sm text-center">编辑器加载中...</p>
        </div>
      )
    }

    return (
      <div className={`bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
        {/* 固定工具栏 */}
        {editable && (
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10 flex-wrap">
            {TOOLBAR_BUTTONS.map(({ key, icon: Icon, title, action, isActive }) => (
              <button
                key={key}
                type="button"
                title={title}
                onClick={() => action(editor)}
                className={`p-1.5 rounded transition-colors ${
                  isActive(editor)
                    ? "bg-red-600/30 text-red-400"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
            <span className="w-px h-5 bg-zinc-700 mx-1" />
            <button
              type="button"
              title="撤销"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              title="重做"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
            >
              <Redo2 size={16} />
            </button>
          </div>
        )}

        {/* 编辑区 */}
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none [&_.ProseMirror]:p-6 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:text-zinc-200 [&_.ProseMirror]:leading-relaxed [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-zinc-100 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-red-800 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-zinc-400 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_p.is-editor-empty]:before:text-zinc-600 [&_.ProseMirror_p.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty]:before:float-left [&_.ProseMirror_p.is-editor-empty]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty]:before:h-0"
        />
      </div>
    )
  }
)
