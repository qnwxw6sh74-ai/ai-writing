"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Slide {
  title: string; highlight: string; suffix: string; description: string
  accent: string; btnBorder: string; highlightColor: string; subColor: string
  btnText: string; href: string; subText?: string
}
interface QuickLink {
  emoji: string; label: string; href: string; external?: boolean
}

const defaultSlides: Slide[] = [
  { title: "🎯 AI写作", highlight: "文章生成器", suffix: "", description: "覆盖情感、职场、教育等30+领域的内容创作平台。基于最新AI大模型，极速生成高质量爆文。", accent: "from-red-600 to-red-800", btnBorder: "border-red-700", highlightColor: "text-red-400", subColor: "text-red-400", btnText: "✍️ 立即开始AI写作", href: "/generate", subText: "AI写作文章生成器 — 公众号自媒体内容创作首选平台" },
  { title: "🏷️ AI", highlight: "爆款标题", suffix: "生成器", description: "输入核心关键词，AI写作文章生成器为您创作5个极具吸引力的爆款标题，引爆阅读量。", accent: "from-red-700 to-rose-900", btnBorder: "border-red-800", highlightColor: "text-red-300", subColor: "text-red-300", btnText: "🚀 生成黄金标题", href: "/title-generator" },
  { title: "🖼️ AI", highlight: "智能配图", suffix: "", description: "AI写作配套工具：输入文字描述，生成高质量、无版权风险的公众号配图，完善内容创作。", accent: "from-rose-800 to-red-950", btnBorder: "border-rose-800", highlightColor: "text-rose-300", subColor: "text-rose-300", btnText: "🎨 设计我的图片", href: "/image-generator" },
]

const defaultQuickLinks: QuickLink[] = [
  { emoji: "✍️", label: "爆文生成", href: "/generate" },
  { emoji: "🏷️", label: "爆文标题生成", href: "/title-generator" },
  { emoji: "🤖", label: "AI检测", href: "https://matrix.tencent.com/ai-detect/ai_gen_txt", external: true },
  { emoji: "🛡️", label: "原创检测", href: "/originality-check" },
  { emoji: "🖼️", label: "图片生成", href: "/image-generator" },
  { emoji: "📚", label: "使用教程", href: "/tutorials" },
  { emoji: "💬", label: "留言板", href: "/guestbook" },
]

interface Props {
  slides?: Slide[]
  quickLinks?: QuickLink[]
}

export function HeroCarousel({ slides = defaultSlides, quickLinks = defaultQuickLinks }: Props) {
  const [current, setCurrent] = useState(0)
  const len = slides.length || 1

  const next = useCallback(() => setCurrent((c) => (c + 1) % len), [len])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + len) % len), [len])

  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  const slide = slides[current]

  return (
    <section className="bg-zinc-950 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-6 gap-8 items-stretch">
        {/* 左侧快捷入口 */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="flex-1 flex flex-col justify-between space-y-2">
            {quickLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="flex items-center w-full p-3 text-left text-zinc-300 bg-zinc-900/50 rounded-lg hover:bg-red-950/30 hover:text-red-300 hover:border-red-800 transition-all duration-200 border border-zinc-800 text-sm"
              >
                <span className="mr-3 text-lg">{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 右侧轮播 */}
        <div className="lg:col-span-5 flex">
          <div className="relative w-full" role="region" aria-roledescription="carousel">
            <button
              type="button"
              onClick={prev}
              className="absolute -left-3 lg:-left-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-red-700 transition-colors text-zinc-400"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="overflow-hidden rounded-xl">
              <div
                className={`rounded-xl border ${slide.btnBorder} bg-gradient-to-br ${slide.accent} min-h-[320px] flex flex-col items-center justify-center p-8 text-center transition-all duration-500 glow-red`}
              >
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-white">
                  {slide.title}
                  {slide.highlight && (
                    <span className={slide.highlightColor}>{slide.highlight}</span>
                  )}
                  {slide.suffix}
                </h2>
                <p className="text-base lg:text-lg text-zinc-300 mb-6 max-w-lg">{slide.description}</p>
                <Link
                  href={slide.href}
                  className="bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-500 transition-all transform hover:scale-105 text-lg inline-block shadow-lg shadow-red-900/30"
                >
                  {slide.btnText}
                </Link>
                {slide.subText && (
                  <p className={`text-sm font-medium ${slide.subColor} mt-6`}>{slide.subText}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={next}
              className="absolute -right-3 lg:-right-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:border-red-700 transition-colors text-zinc-400"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="flex justify-center mt-4 space-x-2">
              {slides.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-red-500" : "w-2 bg-zinc-700"}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
