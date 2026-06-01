"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface Props {
  content: string
}

export function ArticleOutput({ content }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-zinc-100">📄 生成结果</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">约 {content.length} 字</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
          >
            {copied ? <Check size={16} className="text-red-400" /> : <Copy size={16} />}
            {copied ? "已复制" : "复制全文"}
          </button>
        </div>
      </div>
      <div className="prose max-w-none whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}
