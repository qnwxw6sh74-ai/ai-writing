import type { Metadata } from "next"
import { ImageGenerator } from "@/components/image/ImageGenerator"

export const metadata: Metadata = {
  title: "AI智能配图 — 免费公众号配图在线生成",
  description: "AI图片生成器，输入文字描述选择尺寸风格，快速生成高质量无版权公众号配图。支持写实摄影、扁平插画、3D渲染等多种风格。",
  keywords: "AI配图,公众号配图,AI图片生成,免费配图,文章配图,AI插画,智能配图,公众号封面",
  alternates: { canonical: "https://pdf.wyrunwu.com/image-generator" },
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
