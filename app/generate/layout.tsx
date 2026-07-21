import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "AI爆文生成 — 免费在线公众号文章生成器",
  description: "AI爆文生成器，输入关键词一键生成高质量公众号文章。支持情感、职场、教育等30+领域，提供快速生成和大纲精生成两种模式。免费10次，立即体验AI写作。",
  keywords: "AI写作,文章生成器,公众号爆文生成,AI文章生成,智能写作,公众号编辑器,AI爆文,免费AI写作,AI写作平台",
  alternates: { canonical: "https://pdf.wyrunwu.com/generate" },
  openGraph: {
    title: "AI爆文生成 — 免费在线公众号文章生成器",
    description: "输入关键词一键生成高质量公众号文章，支持30+领域，免费10次。",
    url: "https://pdf.wyrunwu.com/generate",
  },
}

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
