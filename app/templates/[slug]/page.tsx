import type { Metadata } from "next"
import Link from "next/link"
import { getConfig } from "@/lib/config"

interface Props {
  params: Promise<{ slug: string }>
}

interface TemplateData {
  title: string; emoji: string; description: string; tips: string[]
}

const fallbackData: Record<string, TemplateData> = {
  emotion: { title: "情感爆文模板", emoji: "💔", description: "情感类文章是公众号最受欢迎的类别之一。掌握情感文的写作技巧，轻松写出触动人心的文章。", tips: ["用真实故事开头，迅速建立情感连接", "描述细节：一个眼神、一句话、一个动作，越具体越动人", "运用对比：曾经的美好 vs 现在的遗憾", "金句收尾：一句话总结全文，让读者忍不住转发", "标题技巧：使用【爱而不得】【最让人心疼】等情感词"] },
  health: { title: "养生爆文模板", emoji: "🧓", description: "养生类文章面向中老年群体，语言要通俗易懂，内容要有科学依据，同时要有实用价值。", tips: ["用权威来源增加可信度：引用研究数据、医生建议", "语言要接地气：避免专业术语，用大白话讲养生", "提供可操作的方法：具体到每天怎么做、吃什么", "善用数字：3个动作、5种食物、每天10分钟", "结尾呼吁行动：从今天开始、为了健康转给家人"] },
  trending: { title: "热点话题模板", emoji: "🌍", description: "蹭热点是快速涨粉的有效方法。但热点文章需要快速出稿，同时要有独特的观点。", tips: ["第一时间跟进：热点24小时内是黄金期", "独特角度：不要只转述新闻，要有自己的观点", "引发讨论：提一个开放性问题，鼓励留言互动", "结合自身定位：把热点和你账号的主题结合", "注意尺度：敏感话题要谨慎，遵守法律法规"] },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const allData: Record<string, TemplateData> = await getConfig("template_pages", fallbackData)
  const data = allData[slug] || fallbackData[slug]
  return { title: `${data?.title || "模板"} - AI公众号爆文网`, description: data?.description }
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params
  const allData: Record<string, TemplateData> = await getConfig("template_pages", fallbackData)
  const data = allData[slug]

  if (!data) {
    return (
      <div className="bg-zinc-950 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-white mb-2">模板未找到</h1>
          <p className="text-zinc-500 mb-6">该模板不存在或已被移除</p>
          <Link href="/" className="text-red-400 hover:text-red-300 transition-colors">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block transition-colors">← 返回首页</Link>
        <h1 className="text-2xl font-bold text-white mb-2">{data.emoji} {data.title}</h1>
        <p className="text-zinc-400 mb-8">{data.description}</p>
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-200 mb-4">✏️ 写作技巧</h2>
          <ul className="space-y-3">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-red-950 text-red-300 rounded-full text-xs font-bold shrink-0 mt-0.5 border border-red-900/30">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 text-center">
          <Link href="/generate" className="inline-block bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30">
            ✍️ 使用此模板开始创作
          </Link>
        </div>
      </div>
    </div>
  )
}
