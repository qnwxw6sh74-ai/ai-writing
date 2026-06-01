import Link from "next/link"

interface TemplateItem { emoji: string; title: string; desc: string; href: string }

const defaultItems: TemplateItem[] = [
  { emoji: "💔", title: "情感爆文模板", desc: "爱而不得：如何写出让人心碎的爆款情感文？", href: "/templates/emotion" },
  { emoji: "🧓", title: "养生爆文模板", desc: "60岁后如何科学养生，让身体年轻10岁？", href: "/templates/health" },
  { emoji: "🌍", title: "热点话题模板", desc: "某地高考满分作文引发热议，你怎么看？", href: "/templates/trending" },
]

interface Props {
  title?: string
  items?: TemplateItem[]
  moreText?: string
  moreHref?: string
}

export function TemplateSection({ title = "🔥 本周最受欢迎模板", items = defaultItems, moreText = "查看更多模板 →", moreHref = "/templates/emotion" }: Props) {
  return (
    <section className="bg-zinc-950 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          {items.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="block border border-zinc-800 p-6 rounded-xl hover:border-red-800 hover:bg-zinc-900 transition-all cursor-pointer group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{t.emoji}</div>
              <h4 className="font-semibold text-base text-zinc-100 group-hover:text-red-400 transition-colors">{t.title}</h4>
              <p className="text-zinc-500 mt-1 text-sm">{t.desc}</p>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <Link href={moreHref} className="text-red-400 font-semibold hover:text-red-300 text-sm transition-colors">
            {moreText}
          </Link>
        </div>
      </div>
    </section>
  )
}
