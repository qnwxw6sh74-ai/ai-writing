"use client"

import { useState } from "react"

interface Props {
  onGenerate: (params: { keyword: string; domain: string; style: string; wordCount: number }) => void
  isLoading: boolean
}

const domains = ["情感", "职场", "教育", "科技", "养生", "娱乐", "财经", "法律", "历史", "美食"]
const styles = ["深度专业", "轻松幽默", "情感共鸣", "干货实用"]
const wordCounts = [
  { label: "短文 (~800字)", value: 800 },
  { label: "中篇 (~1500字)", value: 1500 },
  { label: "长文 (~2500字)", value: 2500 },
]

export function ArticleForm({ onGenerate, isLoading }: Props) {
  const [keyword, setKeyword] = useState("")
  const [domain, setDomain] = useState("情感")
  const [style, setStyle] = useState("情感共鸣")
  const [wordCount, setWordCount] = useState(1500)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return
    onGenerate({ keyword: keyword.trim(), domain, style, wordCount })
  }

  const selectClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
  const inputClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          文章主题 / 关键词 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="例如：中年人的婚姻危机、AI如何改变教育..."
          className={inputClasses}
          required
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">写作领域</label>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClasses}>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">内容风格</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className={selectClasses}>
            {styles.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">文章长度</label>
          <select value={wordCount} onChange={(e) => setWordCount(parseInt(e.target.value))} className={selectClasses}>
            {wordCounts.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI正在创作中...
          </>
        ) : (
          "✍️ 开始生成爆文"
        )}
      </button>
    </form>
  )
}
