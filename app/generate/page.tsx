"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ArticleForm } from "@/components/generate/ArticleForm"
import { ArticleOutput } from "@/components/generate/ArticleOutput"

interface CreditsInfo {
  paymentEnabled: boolean
  total: number
  used: number
  remaining: number
  purchasedCredits: number
}

const quickLinks = [
  { emoji: "✍️", label: "爆文生成", href: "/generate", active: true },
  { emoji: "🏷️", label: "爆文标题生成", href: "/title-generator" },
  { emoji: "🖼️", label: "图片生成", href: "/image-generator" },
  { emoji: "🛡️", label: "原创检测", href: "/originality-check" },
  { emoji: "🎨", label: "风格实验室", href: "/style-lab" },
  { emoji: "📚", label: "使用教程", href: "/tutorials" },
]

export default function GeneratePage() {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [showBuyTip, setShowBuyTip] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [models, setModels] = useState<{ id: number; name: string }[]>([])
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 冷却倒计时
  const startCooldown = useCallback((seconds: number) => {
    setCooldownSeconds(seconds)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          if (cooldownTimer.current) { clearInterval(cooldownTimer.current); cooldownTimer.current = null }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current) }
  }, [])

  useEffect(() => {
    fetchCredits()
    fetch("/api/models").then(r => r.json()).then(d => setModels(d.models || [])).catch(() => {})
  }, [])

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/credits")
      setCredits(await res.json())
    } catch { /* ignore */ }
  }

  const handleGenerate = async (params: {
    keyword: string; domain: string; style: string; wordCount: number; modelId?: number
  }) => {
    // 客户端预检查（快速拦截，避免无意义的请求）
    if (credits?.paymentEnabled && credits.remaining <= 0) {
      setShowBuyTip(true)
      return
    }

    setIsLoading(true)
    setContent("")
    setShowBuyTip(false)
    setErrorMsg("")

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, modelId: params.modelId }),
      })
      const data = await res.json()

      if (res.status === 402) {
        // 额度用完 → 显示购买引导
        setShowBuyTip(true)
        setCredits(data.credits || { paymentEnabled: true, total: credits?.total || 3, used: credits?.total || 3, remaining: 0 })
        return
      }

      if (res.status === 429 && data.code === "COOLDOWN") {
        // 生成冷却中 → 启动倒计时
        setErrorMsg(data.error)
        if (data.waitSeconds) startCooldown(data.waitSeconds)
        return
      }

      if (!res.ok) {
        setErrorMsg(data.error || "生成失败，请稍后重试")
        return
      }

      if (data.content) {
        setContent(data.content)
        startCooldown(90) // 生成成功自动开始90秒冷却
      } else {
        setErrorMsg("AI 返回为空，请换个关键词试试")
      }

      // 服务端已扣积分，直接刷新本地状态
      if (data.credits) {
        setCredits(data.credits)
      } else {
        fetchCredits()
      }
    } catch {
      setErrorMsg("网络连接失败，请检查网络后重试")
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
                    <span className="text-xs text-zinc-500">
                      可用额度
                      {credits.purchasedCredits > 0 && ` (含付费 ${credits.purchasedCredits} 次)`}
                    </span>
                    <div className={`text-lg font-bold ${credits.remaining > 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {credits.remaining} / {credits.total + credits.purchasedCredits}
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

              {errorMsg && (
                <div className="mt-3 bg-yellow-950/30 border border-yellow-900/30 rounded-lg p-3">
                  <span className="text-sm text-yellow-300">{errorMsg}</span>
                </div>
              )}
            </div>

            <ArticleForm onGenerate={handleGenerate} isLoading={isLoading} cooldownSeconds={cooldownSeconds} models={models} />

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

            {content && (
              <ArticleOutput
                content={content}
                credits={credits}
                onCreditsChange={(c) => setCredits((prev) => prev ? { ...prev, ...c } : prev)}
                onConfirm={() => { setCooldownSeconds(0); if (cooldownTimer.current) { clearInterval(cooldownTimer.current); cooldownTimer.current = null } }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
