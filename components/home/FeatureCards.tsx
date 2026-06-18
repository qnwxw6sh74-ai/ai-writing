import Link from "next/link"

interface FeatureItem {
  emoji: string; title: string; description: string; href: string
}

const defaultItems: FeatureItem[] = [
  { emoji: "🏷️", title: "爆款标题工坊", description: "AI写作文章生成器从海量数据提炼爆款标题公式，生成5个让用户忍不住点击的黄金标题。", href: "/title-generator" },
  { emoji: "✍️", title: "AI文章生成器", description: "AI写作核心引擎，自动构建文章框架、填充论据、优化文笔，高质量内容创作一气呵成。", href: "/generate" },
  { emoji: "📚", title: "多领域专家模型", description: "科技、情感、养生等多领域AI写作模型，确保内容创作深度与专业性。", href: "/generate" },
  { emoji: "🛠️", title: "内容创作工具矩阵", description: "AI写作文章生成器集成了AI检测、配图等辅助工具，覆盖内容创作完整流程。", href: "/" },
]

interface Props {
  title?: string
  subtitle?: string
  items?: FeatureItem[]
}

export function FeatureCards({ title = "核心功能 · 为爆文而生", subtitle = "我们不仅仅是内容生成，更是您的智能创作伙伴", items = defaultItems }: Props) {
  return (
    <section className="py-16 lg:py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <p className="text-zinc-500 mt-2">{subtitle}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group block bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 hover:border-red-800 hover:bg-zinc-900 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-red-900/10"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{f.emoji}</div>
              <h3 className="text-lg font-bold mb-2 text-zinc-100 group-hover:text-red-400 transition-colors">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
