"use client"

import { Search } from "lucide-react"

interface ToolCard {
  id: string
  name: string
  description: string
  category: string
  icon: string
}

interface ToolGridProps {
  tools: ToolCard[]
}

export function ToolGrid({ tools }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => (
        <a
          key={tool.id}
          href={`/tools/${tool.id}`}
          className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-red-900/50 transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{tool.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">
                {tool.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                {tool.description}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                {tool.category === 'image' ? '图片工具' : tool.category === 'pdf' ? 'PDF工具' : '文档工具'}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}
