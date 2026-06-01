"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArticleForm } from "@/components/generate/ArticleForm"
import { ArticleOutput } from "@/components/generate/ArticleOutput"

interface CreditsInfo {
  paymentEnabled: boolean
  total: number
  used: number
  remaining: number
}

const quickLinks = [
  { emoji: "✍️", label: "爆文生成", href: "/generate", active: true },
  { emoji: "🏷️", label: "爆文标题生成", href: "/title-generator" },
  { emoji: "🖼️", label: "图片生成", href: "/image-generator" },
  { emoji: "🛡️", label: "原创检测", href: "/originality-check" },
  { emoji: "📚", label: "使用教程", href: "/tutorials" },
]

export default function GeneratePage() {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [showBuyTip, setShowBuyTip] = useState(false)

  useEffect(() => { fetchCredits() }, [])

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/credits")
      setCredits(await res.json())
    } catch { /* ignore */ }
  }

  const handleGenerate = async (params: {
    keyword: string; domain: string; style: string; wordCount: number
  }) => {
    // 检查额度
    if (credits?.paymentEnabled && credits.remaining <= 0) {
      setShowBuyTip(true)
      return
    }

    setIsLoading(true)
    setContent("")
    setShowBuyTip(false)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (data.content) {
        setContent(data.content)
        // 生成成功后记录使用
        fetch("/api/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) })
          .then(() => fetchCredits())
      } else {
        setContent("生成失败，请稍后重试")
      }
    } catch {
      const { generateMockArticle } = await import("@/lib/mock-ai")
      setContent(generateMockArticle(params))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-1">
            <div className="space-y-2 sticky top-24">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center w-full p-3 text-left rounded-lg transition-all duration-200 border text-sm ${
                    link.active
                      ? "bg-red-950/30 border-red-800 text-red-300"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-red-900/50 hover:text-red-300"
                  }`}
                >
                  <span className="mr-3 text-lg">{link.emoji}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">✍️ AI 爆文生成</h1>
                  <p className="text-zinc-400 mt-1">输入关键词，AI 为您生成高质量公众号爆款文章</p>
                </div>
                {credits?.paymentEnabled && (
                  <div className="text-right">
                    <span className="text-xs text-zinc-500">免费额度</span>
                    <div className={`text-lg font-bold ${credits.remaining > 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {credits.remaining} / {credits.total}
                    </div>
                  </div>
                )}
              </div>

              {showBuyTip && (
                <div className="mt-3 bg-red-950/30 border border-red-900/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-red-300">🎯 免费额度已用完，购买套餐即可继续使用</span>
                  <Link href="/pricing" className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors shrink-0">
                    查看套餐
                  </Link>
                </div>
              )}
            </div>

            <ArticleForm onGenerate={handleGenerate} isLoading={isLoading} />

            {isLoading && (
              <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-zinc-800 rounded w-2/3 mx-auto" />
                </div>
                <p className="text-zinc-500 mt-6 text-sm">AI 正在为您创作，请稍候...</p>
              </div>
            )}

            {content && <ArticleOutput content={content} />}
          </div>
        </div>
      </div>
    </div>
  )
}
