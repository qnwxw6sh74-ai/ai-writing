import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { getConfig, getPaymentEnabled } from "@/lib/config"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "公众号爆文生成器 — AI智能写作助手，一键生成高质量原创文章",
    template: "%s — 公众号爆文网",
  },
  description: "专业的AI公众号文章生成工具，覆盖情感、职场、教育等30+领域。输入关键词秒级生成爆款文章、黄金标题、智能配图，助你轻松产出10W+爆文。支持AI写作、文章生成器、智能写作、公众号编辑等场景。",
  keywords: "AI写作,公众号爆文,文章生成器,智能写作,公众号写作,自媒体助手,内容创作,AI生成文章,爆文标题,AI配图,AI写作平台,公众号编辑器,微信爆文",
  authors: [{ name: "公众号爆文网" }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: "公众号爆文生成器 — AI智能写作助手",
    description: "覆盖情感、职场、教育等30+领域，输入关键词秒级生成爆款文章、黄金标题、智能配图，助你轻松产出10W+爆文。",
    siteName: "公众号爆文网",
    locale: "zh_CN",
    type: "website",
    url: "https://w.wyrunwu.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "公众号爆文生成器 — AI智能写作助手",
    description: "覆盖情感、职场、教育等30+领域，输入关键词秒级生成爆款文章、黄金标题、智能配图。",
  },
  alternates: {
    canonical: "https://w.wyrunwu.com",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [headerConfig, footerConfig, enablePayment] = await Promise.all([
    getConfig("header_config", { siteName: "公众号爆文生成器", navLinks: [] as { label: string; href: string }[] }),
    getConfig("footer_config", { email: "contact@你的域名.com", copyright: "公众号爆文生成器 | 本站使用AI大模型驱动，所有内容仅供参考。", links: [] as { label: string; href: string }[] }),
    getPaymentEnabled(),
  ])

  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Header siteName={headerConfig.siteName} navLinks={headerConfig.navLinks} enablePayment={enablePayment} />
        <main className="flex-1">{children}</main>
        <Footer email={footerConfig.email} copyright={footerConfig.copyright} links={footerConfig.links} />
      </body>
    </html>
  )
}
