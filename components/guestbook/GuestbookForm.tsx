"use client"

import { useState } from "react"
import { Send } from "lucide-react"

interface Props {
  onSubmit: (nickname: string, content: string) => Promise<void>
}

export function GuestbookForm({ onSubmit }: Props) {
  const [nickname, setNickname] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(nickname.trim(), content.trim())
      setContent("")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">昵称</label>
        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="你的昵称" className={inputClasses} required maxLength={50} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">留言内容</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你想说的话..." rows={4} className={`${inputClasses} resize-none`} required maxLength={500} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">{content.length}/500</span>
        <button
          type="submit"
          disabled={submitting}
          className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
        >
          {submitting ? "提交中..." : success ? "✅ 留言成功" : <><Send size={16} /> 提交留言</>}
        </button>
      </div>
    </form>
  )
}
