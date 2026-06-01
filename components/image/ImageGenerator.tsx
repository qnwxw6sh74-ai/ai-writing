"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

const sizes = [
  { label: "公众号封面 (900×383)", value: "900x383" },
  { label: "方形配图 (800×800)", value: "800x800" },
  { label: "横版插图 (600×400)", value: "600x400" },
]
const imgStyles = ["写实摄影", "扁平插画", "3D渲染", "简约水墨", "赛博朋克", "温暖治愈"]

const selectClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState("900x383")
  const [style, setStyle] = useState("写实摄影")

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">图片描述</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的图片内容，如：一位年轻女性在咖啡馆窗边写作..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">图片尺寸</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} className={selectClasses}>
              {sizes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">风格</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} className={selectClasses}>
              {imgStyles.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button
          disabled
          className="w-full bg-zinc-800 text-zinc-500 font-bold py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-700"
        >
          <ImageIcon size={18} />
          图片生成即将上线，敬请期待
        </button>
      </div>

      <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center">
        <div className="text-6xl mb-4">🖼️</div>
        <p className="text-zinc-400 text-lg">AI 智能配图功能正在开发中</p>
        <p className="text-zinc-600 text-sm mt-1">上线后将支持多种风格和尺寸的公众号配图生成</p>
        <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
              <ImageIcon size={28} className="text-zinc-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
