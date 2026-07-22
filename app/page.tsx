import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DocConverter — 免费在线文档转换工具",
  description: "在线文档与图片转换工具，支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF 等。免费、快速、安全，无需安装软件。",
  keywords: "PDF工具,图片压缩,图片转换,PDF合并,PDF拆分,文档转换,在线工具,免费PDF,图片转PDF,PDF转图片",
  alternates: { canonical: "https://pdf.wyrunwu.com" },
}

export default async function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "DocConverter",
            url: "https://pdf.wyrunwu.com",
            description: "在线文档与图片转换工具，支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF。",
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "CNY",
              description: "免费使用，高级功能付费",
            },
            author: {
              "@type": "Organization",
              name: "DocConverter",
            },
          }),
        }}
      />
      <div className="min-h-screen bg-zinc-950">
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            免费在线文档转换工具
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
            支持 PDF 合并/拆分、图片压缩、格式转换、图片转 PDF 等。
            免费、快速、安全，无需安装任何软件。
          </p>
          <a href="/tools" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
            浏览全部工具 →
          </a>
        </div>

        {/* Tool Cards */}
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "🖼️", title: "图片压缩", desc: "压缩图片体积，保持画质", href: "/tools/image-compress" },
              { icon: "🔄", title: "格式转换", desc: "JPG/PNG/WebP 互转", href: "/tools/image-convert" },
              { icon: "📄", title: "PDF 合并", desc: "多个 PDF 合并为一个", href: "/tools/pdf-merge" },
              { icon: "✂️", title: "PDF 拆分", desc: "按页拆分或提取指定页", href: "/tools/pdf-split" },
              { icon: "📑", title: "图片转 PDF", desc: "多张图片合并为 PDF", href: "/tools/image-to-pdf" },
            ].map(tool => (
              <a key={tool.href} href={tool.href} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-red-900/50 transition-colors group">
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h3 className="text-white font-semibold mb-1 group-hover:text-red-400 transition-colors">{tool.title}</h3>
                <p className="text-zinc-500 text-sm">{tool.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
