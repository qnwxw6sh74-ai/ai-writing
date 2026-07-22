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
    default: "DocConverter — 免费在线文档转换工具",
    template: "%s — DocConverter",
  },
  description: "在线文档与图片转换工具，支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF 等。免费、快速、安全，无需安装软件。",
  keywords: "PDF工具,图片压缩,图片转换,PDF合并,PDF拆分,文档转换,在线工具,免费PDF,图片转PDF,PDF转图片",
  authors: [{ name: "DocConverter" }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: "DocConverter — 免费在线文档转换工具",
    description: "支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF 等。免费、快速、安全。",
    siteName: "DocConverter",
    locale: "zh_CN",
    type: "website",
    url: "https://pdf.wyrunwu.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocConverter — 免费在线文档转换工具",
    description: "支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF 等。",
  },
  alternates: {
    canonical: "https://pdf.wyrunwu.com",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 延迟加载服务初始化（避免阻塞首屏）
  import("@/lib/init-server").then(m => m.initServer()).catch(() => {})

  const [headerConfig, footerConfig, enablePayment] = await Promise.all([
    getConfig("header_config", { siteName: "DocConverter", navLinks: [] as { label: string; href: string }[] }),
    getConfig("footer_config", { email: "contact@yourdomain.com", copyright: "DocConverter | 免费在线文档转换工具。", links: [] as { label: string; href: string }[] }),
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
