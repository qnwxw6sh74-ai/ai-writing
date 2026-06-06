"use client"

import { useState } from "react"
import { ImageIcon, Loader2, Download, RefreshCw, AlertCircle } from "lucide-react"

const sizes = [
  { label: "公众号封面 (900×383)", value: "900x383" },
  { label: "方形配图 (800×800)", value: "800x800" },
  { label: "横版插图 (600×400)", value: "600x400" },
]
const imgStyles = ["写实摄影", "扁平插画", "3D渲染", "简约水墨", "赛博朋克", "温暖治愈"]

const selectClasses = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none"

interface CreditsInfo {
  remaining: number
  used: number
}

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState("900x383")
  const [style, setStyle] = useState("写实摄影")

  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入图片描述")
      return
    }
    setError(null)
    setImageUrl(null)
    setLoading(true)

    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size, style }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || `生成失败 (${res.status})`)
        return
      }

      setImageUrl(data.imageUrl)
      if (data.credits) {
        setCredits({
          remaining: data.credits.remaining,
          used: data.credits.used,
        })
      }
    } catch {
      setError("网络异常，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!imageUrl) return
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-image-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // 跨域图片无法 fetch 时，直接新窗口打开
      window.open(imageUrl, "_blank")
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-4">
        {/* 描述输入 */}
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

        {/* 尺寸 + 风格 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">图片尺寸</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} className={selectClasses} title="图片尺寸">
              {sizes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">风格</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} className={selectClasses} title="图片风格">
              {imgStyles.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              AI 正在生成图片...
            </>
          ) : (
            <>
              <ImageIcon size={18} />
              生成配图（消耗 1 积分）
            </>
          )}
        </button>

        {/* 积分提示 */}
        {credits && (
          <p className="text-center text-xs text-zinc-500">
            本次生成消耗 1 积分 · 剩余 {credits.remaining} 积分
          </p>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* 图片展示区 */}
      {(imageUrl || loading) && (
        <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              {loading ? "生成中..." : "生成结果"}
            </h3>
            {imageUrl && !loading && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition"
                >
                  <Download size={14} />
                  下载
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition"
                >
                  <RefreshCw size={14} />
                  重新生成
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm">AI 正在绘制中，请稍候...</p>
              </div>
            ) : (
              <img
                src={imageUrl!}
                alt={prompt}
                className="w-full h-auto"
                onError={() => setError("图片加载失败，可能是生成的图片链接已过期，请重新生成")}
              />
            )}
          </div>
        </div>
      )}

      {/* 空状态 — 未生成时展示 */}
      {!imageUrl && !loading && (
        <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-zinc-400 text-lg">输入描述，AI 为你生成配图</p>
          <p className="text-zinc-600 text-sm mt-1">支持多种风格和尺寸的公众号配图</p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
            {["写实摄影", "扁平插画", "3D渲染"].map((s) => (
              <div
                key={s}
                onClick={() => setStyle(s)}
                className={`aspect-video rounded-lg flex items-center justify-center border cursor-pointer transition text-sm ${
                  style === s
                    ? "bg-red-900/30 border-red-700 text-red-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
