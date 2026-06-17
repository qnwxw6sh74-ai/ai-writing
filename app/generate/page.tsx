"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArticleForm } from "@/components/generate/ArticleForm"
import { ArticleOutput } from "@/components/generate/ArticleOutput"
import { OutlineEditor } from "@/components/generate/OutlineEditor"
import { PaymentModal } from "@/components/generate/PaymentModal"
import { getUserErrorMessage } from "@/lib/fetch-utils"

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

function GenerateContent() {
  const [content, setContent] = useState("")
  const [contentB, setContentB] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [showBuyTip, setShowBuyTip] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [models, setModels] = useState<{ id: number; name: string }[]>([])
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchParams = useSearchParams()
  const initialKeyword = searchParams.get("keyword") || ""

  // 链式生成状态
  type GeneratePhase = "input" | "outline" | "generating" | "result"
  const [phase, setPhase] = useState<GeneratePhase>("input")
  const [outlineMode, setOutlineMode] = useState(false)
  const [outline, setOutline] = useState<{
    outlineId: number; title: string; sections: { heading: string; estimatedWords: number; keyPoints: string; orderIndex: number }[]
  } | null>(null)

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

  // 大纲模式：生成大纲
  const handleOutline = async (params: {
    keyword: string; domain: string; style: string; wordCount: number; modelId?: number
  }) => {
    setIsLoading(true)
    setContent("")
    setOutline(null)
    setErrorMsg("")

    try {
      const res = await fetch("/api/generate/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "大纲生成失败")
        setPhase("input")
        setIsLoading(false)
        return
      }
      setOutline(data)
      setPhase("outline")
    } catch (e) {
      setErrorMsg(getUserErrorMessage(e, "网络连接失败"))
    } finally {
      setIsLoading(false)
    }
  }

  // 大纲全部段落生成完毕 → 显示结果
  const handleChainDone = (fullArticle: string, title: string) => {
    setContent(fullArticle)
    setPhase("result")
    fetchCredits()
  }

  const handleGenerate = async (params: {
    keyword: string; domain: string; style: string; wordCount: number; modelId?: number
  }) => {
    // 客户端预检查
    if (credits?.paymentEnabled && credits.remaining <= 0) {
      setShowBuyTip(true)
      return
    }

    // 大纲模式 → 生成大纲
    if (outlineMode) {
      await handleOutline(params)
      return
    }

    // 快速生成模式（原有逻辑）
    setIsLoading(true)
    setContent("")
    setContentB("")
    setShowBuyTip(false)
    setErrorMsg("")
    setPhase("input")

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
        if (data.contentB) setContentB(data.contentB)
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
    } catch (e) {
      setErrorMsg(getUserErrorMessage(e, "网络连接失败，请检查网络后重试"))
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

              {showBuyTip && credits?.paymentEnabled && (
                <PaymentModal
                  open={showBuyTip}
                  onClose={() => setShowBuyTip(false)}
                  onPaid={() => { setShowBuyTip(false); fetchCredits() }}
                />
              )}

              {errorMsg && (
                <div className="mt-3 bg-yellow-950/30 border border-yellow-900/30 rounded-lg p-3">
                  <span className="text-sm text-yellow-300">{errorMsg}</span>
                </div>
              )}
            </div>

            {/* 生成模式切换 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-zinc-500">生成模式：</span>
              <button
                type="button"
                onClick={() => { setOutlineMode(false); setPhase("input"); setOutline(null) }}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${!outlineMode ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
              >
                ⚡ 快速生成
              </button>
              <button
                type="button"
                onClick={() => { setOutlineMode(true); setPhase("input"); setContent(""); setContentB(""); setOutline(null) }}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${outlineMode ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
              >
                📋 大纲精生成
              </button>
            </div>

            {/* 输入阶段：显示表单 */}
            {(phase === "input" || !outlineMode) && (
              <ArticleForm onGenerate={handleGenerate} isLoading={isLoading} cooldownSeconds={cooldownSeconds} models={models} initialKeyword={initialKeyword} />
            )}

            {/* 加载中骨架屏 */}
            {isLoading && (
              <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-zinc-800 rounded w-2/3 mx-auto" />
                </div>
                <p className="text-zinc-500 mt-6 text-sm">
                  {outlineMode ? "AI 正在生成文章大纲..." : "AI 正在为您创作，请稍候..."}
                </p>
              </div>
            )}

            {/* 大纲阶段：显示大纲编辑器 */}
            {outlineMode && outline && (phase === "outline" || phase === "generating") && (
              <div className="mt-6">
                <OutlineEditor
                  outline={outline}
                  onGenerated={handleChainDone}
                  onError={setErrorMsg}
                  onBack={() => { setPhase("input"); setOutline(null) }}
                />
              </div>
            )}

            {/* 结果阶段：显示文章 */}
            {content && (
              <ArticleOutput
                content={content}
                contentB={contentB || undefined}
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

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="bg-zinc-950 min-h-screen" />}>
      <GenerateContent />
    </Suspense>
  )
}
