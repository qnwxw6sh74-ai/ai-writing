import Link from "next/link"

interface StepItem { num: string; label: string; desc: string }

const defaultSteps: StepItem[] = [
  { num: "1", label: "输入关键词 / 主题", desc: "输入您想要创作的内容主题或关键词" },
  { num: "2", label: "选择内容风格", desc: "情感 / 职场 / 教育 / 娱乐 等多种风格可选" },
  { num: "3", label: "点击生成爆文", desc: "AI 将快速生成高质量爆文内容" },
  { num: "4", label: "质量检测优化", desc: "可进行原创检测与 AI 检测，提升内容质量" },
]

interface Props {
  title?: string
  steps?: StepItem[]
  ctaText?: string
  ctaHref?: string
}

export function HowToUse({ title = "📖 如何使用本工具？", steps = defaultSteps, ctaText = "🚀 立即开始创作", ctaHref = "/generate" }: Props) {
  return (
    <section className="bg-zinc-900/50 py-16 lg:py-20 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">{title}</h2>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6">
              {steps.map((step, i) => (
                <div key={step.num} className="flex flex-col lg:flex-row items-center">
                  <div className="flex flex-col items-center text-center w-48 lg:w-56">
                    <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm mb-3 shadow-lg shadow-red-900/30">
                      {step.num}
                    </div>
                    <h3 className="font-semibold text-zinc-200 mb-1 whitespace-nowrap text-sm lg:text-base">{step.label}</h3>
                    <p className="text-zinc-500 text-xs lg:text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <span className="text-red-600 text-2xl mx-2 my-2 lg:my-0 rotate-90 lg:rotate-0">→</span>
                  )}
                </div>
              ))}
              <Link
                href={ctaHref}
                className="inline-flex items-center bg-gradient-to-r from-red-600 to-red-800 text-white font-bold py-4 px-10 rounded-full hover:from-red-500 hover:to-red-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap text-base shadow-lg shadow-red-900/30 mt-6 lg:mt-0"
              >
                <span className="mr-2">{ctaText.slice(0, 2)}</span>{ctaText.slice(2)}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
