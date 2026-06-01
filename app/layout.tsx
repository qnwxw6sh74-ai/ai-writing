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
  title: "AI爆文生成器 | 公众号AI内容创作工具 - 公众号爆文网",
  description: "专业的AI文章生成工具，支持多领域智能创作，快速生成高质量原创文章。适用于公众号、自媒体、博客等内容创作场景。",
  keywords: "公众号爆文,AI写作,文章生成器,公众号写作,自媒体助手,智能写作,内容创作,AI助手",
  authors: [{ name: "智能写作助手" }],
  robots: { index: true, follow: true },
  openGraph: {
    title: "公众号爆文 - AI文章生成器",
    description: "专业的AI文章生成工具，支持多领域智能创作，快速生成高质量原创文章。",
    siteName: "公众号爆文 - AI文章生成器",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "公众号爆文 - AI文章生成器",
    description: "专业的AI文章生成工具，支持多领域智能创作，快速生成高质量原创文章。",
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
