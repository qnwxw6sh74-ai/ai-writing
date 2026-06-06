import type { Metadata } from "next"
import { ImageGenerator } from "@/components/image/ImageGenerator"

export const metadata: Metadata = {
  title: "AI智能配图 - AI公众号爆文网",
  description: "输入文字描述，选择图片尺寸，即可生成高质量、无版权风险的公众号配图。",
}

export const dynamic = "force-dynamic"

export default function ImageGeneratorPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🖼️ AI 智能配图</h1>
          <p className="text-zinc-400 mt-1">输入文字描述，AI 为您生成高质量公众号配图</p>
        </div>
        <ImageGenerator />
      </div>
    </div>
  )
}
