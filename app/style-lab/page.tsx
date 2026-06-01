import type { Metadata } from "next"
import { StyleUploader } from "@/components/style/StyleUploader"

export const metadata: Metadata = {
  title: "风格实验室 - AI公众号爆文网",
  description: "上传3篇以上的文章，AI分析你的写作风格，后续生成的文章将自动模仿你的风格。",
}

export default function StyleLabPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">🎨 风格实验室</h1>
          <p className="text-zinc-400 mt-2">
            上传你的3篇以上代表文章，AI 将学习你的写作风格，并在后续生成时自动模仿
          </p>
        </div>

        <StyleUploader />

        {/* 使用说明 */}
        <div className="mt-12 bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 max-w-3xl mx-auto">
          <h3 className="font-bold text-zinc-200 mb-4">📖 如何使用？</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="flex gap-3">
              <span className="text-red-400 font-bold shrink-0">1.</span>
              <p>准备3篇以上你写过的文章（.txt / .md 格式），每篇至少100字</p>
            </div>
            <div className="flex gap-3">
              <span className="text-red-400 font-bold shrink-0">2.</span>
              <p>拖拽上传或点击选择文件，AI 将分析你的句式、词汇、段落、语气等6个维度</p>
            </div>
            <div className="flex gap-3">
              <span className="text-red-400 font-bold shrink-0">3.</span>
              <p>分析完成后，风格档案自动保存。后续在「爆文生成」和「标题生成」时，AI 会自动应用你的风格</p>
            </div>
            <div className="flex gap-3">
              <span className="text-red-400 font-bold shrink-0">4.</span>
              <p>随时可以重新上传更新风格，或清除档案恢复默认风格</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
