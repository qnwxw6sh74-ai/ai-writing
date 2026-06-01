import type { Metadata } from "next"
import pool from "@/lib/db"

export const metadata: Metadata = {
  title: "关于我们 - AI公众号爆文网",
  description: "了解公众号爆文生成器背后的故事。",
}

interface Section {
  title: string
  content: string
  list: string[]
  muted: boolean
}

const fallbackSections: Section[] = [
  {
    title: "🎯 我们的使命",
    content: "在内容为王的时代，优质内容是公众号运营的核心竞争力。然而，持续产出高质量内容对于许多自媒体人来说是一项巨大的挑战。公众号爆文生成器致力于通过AI技术降低内容创作的门槛，让每一个有想法的人都能轻松创作出吸引人的文章。",
    list: [],
    muted: false,
  },
  {
    title: "💡 我们能做什么",
    content: "",
    list: [
      "<strong>智能文章生成</strong> — 输入关键词，AI在几十秒内生成一篇结构完整的文章",
      "<strong>爆款标题创作</strong> — 基于数据分析，生成高点击率的标题",
      "<strong>多领域覆盖</strong> — 情感、职场、教育、科技、养生等30+领域",
      "<strong>内容质量检测</strong> — 原创度检测、AI痕迹检测",
    ],
    muted: false,
  },
  {
    title: "📧 联系我们",
    content: "如果您有任何建议、合作意向或使用问题，欢迎通过以下方式联系我们：\n📧 邮箱：contact@你的域名.com\n💬 也可以通过留言板给我们留言",
    list: [],
    muted: false,
  },
  {
    title: "⚠️ 免责声明",
    content: "本站使用AI大模型驱动，所有生成内容仅供参考使用。用户应自行判断内容的准确性、适用性和原创性。使用本工具生成的内容产生的任何后果，本站不承担相关责任。请遵守相关法律法规和平台规范，不要将本工具用于生成违法、违规或有害内容。",
    list: [],
    muted: true,
  },
]

export default async function AboutPage() {
  let sections: Section[] = fallbackSections

  try {
    const [rows] = await pool.execute(
      "SELECT `value` FROM site_config WHERE `key` = 'about_content'"
    ) as any[]
    if (rows.length > 0 && rows[0].value) {
      const parsed = JSON.parse(rows[0].value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        sections = parsed
      }
    }
  } catch {
    // 数据库不可用，使用备用内容
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">📖 关于我们</h1>
        <p className="text-zinc-400 mb-8">了解公众号爆文生成器的故事与使命</p>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h2 className={`text-lg font-bold mb-3 ${section.muted ? "text-zinc-500" : "text-white"}`}>{section.title}</h2>
              {section.content && <p className={`text-sm leading-relaxed whitespace-pre-wrap ${section.muted ? "text-zinc-500" : "text-zinc-400"}`}>{section.content}</p>}
              {section.list && section.list.length > 0 && (
                <ul className="space-y-2 text-sm text-zinc-400">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
