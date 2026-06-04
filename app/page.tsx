import type { Metadata } from "next"
import { getConfigs } from "@/lib/config"
import { HomeClient } from "@/components/home/HomeClient"

export const metadata: Metadata = {
  title: "公众号爆文生成器 — AI智能写作助手，一键生成高质量原创文章",
  description: "专业的AI公众号文章生成工具，覆盖情感、职场、教育等30+领域。输入关键词，秒级生成爆款文章、黄金标题，助你轻松产出10W+爆文。",
  keywords: "AI写作,公众号爆文,文章生成器,自媒体助手,智能写作,公众号写作,内容创作,AI生成文章",
}

// 默认静态数据（数据库不可用时的降级方案）
const defaults = {
  home_hero_slides: [
    { title: "🎯 一键生成", highlight: "10W+", suffix: "爆款文章", description: "覆盖情感、职场、教育等30+领域，基于最新AI大模型，极速生成高质量爆文。", accent: "from-red-600 to-red-800", btnBorder: "border-red-700", highlightColor: "text-red-400", subColor: "text-red-400", btnText: "✍️ 立即开始创作", href: "/generate", subText: "AI 内容创作工具，助力公众号、自媒体打造高质量爆文" },
    { title: "🏷️ AI", highlight: "爆款标题", suffix: "生成器", description: "输入核心关键词，AI 为您创作5个极具吸引力的爆款标题，引爆阅读量。", accent: "from-red-700 to-rose-900", btnBorder: "border-red-800", highlightColor: "text-red-300", subColor: "text-red-300", btnText: "🚀 生成黄金标题", href: "/title-generator" },
    { title: "🖼️ AI", highlight: "智能配图", suffix: "", description: "输入文字描述，选择图片尺寸，即可生成高质量、无版权风险的公众号配图。", accent: "from-rose-800 to-red-950", btnBorder: "border-rose-800", highlightColor: "text-rose-300", subColor: "text-rose-300", btnText: "🎨 设计我的图片", href: "/image-generator" },
  ],
  home_hero_links: [
    { emoji: "✍️", label: "爆文生成", href: "/generate" },
    { emoji: "🏷️", label: "爆文标题生成", href: "/title-generator" },
    { emoji: "🤖", label: "AI检测", href: "https://matrix.tencent.com/ai-detect/ai_gen_txt", external: true },
    { emoji: "🛡️", label: "原创检测", href: "/originality-check" },
    { emoji: "🖼️", label: "图片生成", href: "/image-generator" },
    { emoji: "📚", label: "使用教程", href: "/tutorials" },
    { emoji: "💬", label: "留言板", href: "/guestbook" },
  ],
  home_features: { title: "核心功能 · 为爆文而生", subtitle: "我们不仅仅是内容生成，更是您的智能创作伙伴", items: [{ emoji: "🏷️", title: "爆款标题工坊", description: "输入关键词，AI从海量数据中提炼爆款标题公式，生成5个让用户忍不住点击的黄金标题。", href: "/title-generator" }, { emoji: "✍️", title: "全文智能生成", description: "选中一个标题，AI将自动围绕核心主题，构建文章框架、填充论据、优化文笔，一气呵成。", href: "/generate" }, { emoji: "📚", title: "多领域专家模型", description: "无论是科技、情感还是养生，我们为不同领域训练专属模型，确保内容深度与专业性。", href: "/generate" }, { emoji: "🛠️", title: "实用工具矩阵", description: "集成了AI内容检测、图片生成等辅助工具，覆盖从构思到发布的完整流程。", href: "/" }] },
  home_steps: { title: "📖 如何使用本工具？", items: [{ num: "1", label: "输入关键词 / 主题", desc: "输入您想要创作的内容主题或关键词" }, { num: "2", label: "选择内容风格", desc: "情感 / 职场 / 教育 / 娱乐 等多种风格可选" }, { num: "3", label: "点击生成爆文", desc: "AI 将快速生成高质量爆文内容" }, { num: "4", label: "质量检测优化", desc: "可进行原创检测与 AI 检测，提升内容质量" }], ctaText: "🚀 立即开始创作", ctaHref: "/generate" },
  home_testimonials: { title: "👥 用户好评", items: [{ quote: "原来写公众号这么简单，一键生成的文章比我写的还流畅！", author: "小王", role: "自媒体作者" }, { quote: "用它发的文章，阅读量明显提升了，标题和开头都非常抓人！", author: "阿静", role: "公众号运营者" }, { quote: "有了这个工具，我每天可以稳定产出3篇高质量文章，效率提升了10倍。", author: "老李", role: "内容创业者" }, { quote: "标题生成器太好用了！以前想标题想半天，现在几秒钟就有了。", author: "小美", role: "新手号主" }] },
  home_cta: { title: "🚀 准备好创作爆款了吗？", subtitle: "数千位自媒体人已在用，让AI帮你写爆文", buttonText: "免费开始创作", buttonHref: "/generate" },
  home_templates: { title: "🔥 本周最受欢迎模板", items: [{ emoji: "💔", title: "情感爆文模板", desc: "爱而不得：如何写出让人心碎的爆款情感文？", href: "/templates/emotion" }, { emoji: "🧓", title: "养生爆文模板", desc: "60岁后如何科学养生，让身体年轻10岁？", href: "/templates/health" }, { emoji: "🌍", title: "热点话题模板", desc: "某地高考满分作文引发热议，你怎么看？", href: "/templates/trending" }], moreText: "查看更多模板 →", moreHref: "/templates/emotion" },
}

export default async function HomePage() {
  const keys = ["home_hero_slides", "home_hero_links", "home_features", "home_steps", "home_testimonials", "home_cta", "home_templates"]
  const configs = await getConfigs(keys)

  const data: Record<string, any> = {}
  for (const k of keys) {
    data[k] = configs[k] ?? (defaults as any)[k]
  }

  return <HomeClient {...(data as any)} />
}
