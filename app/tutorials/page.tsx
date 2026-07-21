import type { Metadata } from "next"
import { getConfig } from "@/lib/config"

export const metadata: Metadata = {
  title: "AI写作教程 — 文章生成器使用指南",
  description: "AI写作文章生成器使用教程，从零开始学习内容创作。覆盖文章生成、标题创作、AI配图等完整指南。",
  keywords: "AI写作教程,文章生成器使用,内容创作指南,公众号写作教程,AI写作入门",
  alternates: { canonical: "https://pdf.wyrunwu.com/tutorials" },
}

interface TutorialItem { title: string; content: string }

const fallbackTutorials: TutorialItem[] = [
  { title: "1. 注册与开始使用", content: "首先访问我们的网站，无需注册即可免费体验。您可以直接在首页点击免费开始创作按钮，或通过导航栏进入爆文生成页面。\n\n**免费额度**：每位新用户可以获得3次免费的AI生成额度。" },
  { title: "2. 如何生成一篇爆文", content: "进入爆文生成页面后：\n\n1. **输入文章主题/关键词**：越具体越好\n2. **选择写作领域**：情感、职场、教育、科技、养生等\n3. **选择内容风格**：深度专业、轻松幽默、情感共鸣、干货实用\n4. **选择文章长度**：短文~800字、中篇~1500字、长文~2500字\n5. **点击生成**：AI自动创作，完成后可一键复制" },
  { title: "3. 爆款标题生成技巧", content: "好的标题是爆文的一半：\n\n1. 输入核心关键词，而不是完整的标题\n2. 系统从不同角度生成5个标题\n3. 选择最适合的标题\n\n**标题技巧**：使用数字、制造悬念、情感共鸣" },
  { title: "4. 原创检测与优化", content: "生成文章后建议使用原创检测：\n\n1. 将文章粘贴到检测框中\n2. 点击开始检测\n3. 根据评分和建议优化\n\n**提升原创度方法**：加入个人观点、替换表达方式、补充独特案例" },
  { title: "5. 充值付费说明", content: "免费额度用完后可购买套餐：\n\n- 体验套餐：¥9.90 = 10次生成\n- 标准套餐：¥29.90 = 50次生成（推荐）\n- 专业套餐：¥59.90 = 150次生成\n\n支持微信支付和支付宝，支付成功后即时到账。" },
]

export default async function TutorialsPage() {
  const tutorials: TutorialItem[] = await getConfig("tutorials_content", fallbackTutorials)

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">📚 使用教程</h1>
        <p className="text-zinc-400 mb-8">从零开始，快速上手 AI 爆文生成器</p>
        <div className="space-y-6">
          {tutorials.map((t) => (
            <div key={t.title} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-lg font-bold text-zinc-200 mb-3">{t.title}</h2>
              <div className="prose text-sm leading-relaxed whitespace-pre-wrap text-zinc-400">{t.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
