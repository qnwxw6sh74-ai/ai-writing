import { getAllTools } from '@/lib/tools/registry'
import { ToolGrid } from '@/components/tools/ToolGrid'

export default function ToolsPage() {
  const tools = getAllTools()

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            在线文档工具
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            免费、快速、安全地处理您的文件和图片
          </p>
        </div>

        {/* Tool Grid */}
        <ToolGrid tools={tools.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
        }))} />

        {/* SEO Content */}
        <div className="mt-16 prose prose-invert max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white">为什么选择我们的工具？</h2>
          <ul className="text-zinc-400 space-y-2">
            <li>✅ 完全在浏览器中处理，保护您的隐私</li>
            <li>✅ 无需安装任何软件</li>
            <li>✅ 支持批量处理</li>
            <li>✅ 处理完成后自动清理文件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
