interface TestimonialItem { quote: string; author: string; role: string }

const defaultItems: TestimonialItem[] = [
  { quote: "原来写公众号这么简单，一键生成的文章比我写的还流畅！", author: "小王", role: "自媒体作者" },
  { quote: "用它发的文章，阅读量明显提升了，标题和开头都非常抓人！", author: "阿静", role: "公众号运营者" },
  { quote: "有了这个工具，我每天可以稳定产出3篇高质量文章，效率提升了10倍。", author: "老李", role: "内容创业者" },
  { quote: "标题生成器太好用了！以前想标题想半天，现在几秒钟就有了。", author: "小美", role: "新手号主" },
]

interface Props {
  title?: string
  items?: TestimonialItem[]
}

export function Testimonials({ title = "👥 用户好评", items = defaultItems }: Props) {
  return (
    <section className="bg-zinc-950 py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10 text-white">{title}</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {items.map((t, i) => (
            <div key={i} className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 hover:border-red-900/50 transition-colors">
              <p className="text-zinc-400 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-right font-semibold mt-4 text-sm text-zinc-300">
                — {t.author}，<span className="text-red-400">{t.role}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
