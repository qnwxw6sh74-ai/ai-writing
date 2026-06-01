import type { Metadata } from "next"
import { TitleGenerator } from "@/components/title/TitleGenerator"

export const metadata: Metadata = {
  title: "爆文标题生成器 - AI公众号爆文网",
  description: "输入核心关键词，AI为您创作5个极具吸引力的爆款标题，引爆阅读量。",
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
