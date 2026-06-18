import type { Metadata } from "next"
import { TitleGenerator } from "@/components/title/TitleGenerator"

export const metadata: Metadata = {
  title: "爆文标题生成器 — 免费在线公众号标题生成",
  description: "输入核心关键词，AI智能分析爆款标题公式，为您生成5个极具吸引力的公众号标题。运用数字、悬念、对比等技巧，引爆阅读量。",
  keywords: "公众号标题生成,爆文标题,标题生成器,AI标题,自媒体标题,公众号起标题,免费标题生成",
  alternates: { canonical: "https://w.wyrunwu.com/title-generator" },
}

export default function TitleGeneratorPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🏷️ AI 爆款标题生成器</h1>
          <p className="text-zinc-400 mt-1">输入核心关键词，AI 为您创作5个极具吸引力的爆款标题，引爆阅读量</p>
        </div>
        <TitleGenerator />
      </div>
    </div>
  )
}
