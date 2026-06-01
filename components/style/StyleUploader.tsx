"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Trash2, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react"

interface StyleProfile {
  sentenceStyle: string
  vocabulary: string
  paragraphStructure: string
  tone: string
  rhetoric: string
  rhythm: string
}

export function StyleUploader() {
  const [articles, setArticles] = useState<{ name: string; text: string }[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [profile, setProfile] = useState<StyleProfile | null>(null)
  const [error, setError] = useState("")
  const [hasExisting, setHasExisting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载已有风格
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/style/profile")
      const data = await res.json()
      if (data.hasStyle) {
        setProfile(data.profile)
        setHasExisting(true)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  // 处理文件上传
  const handleFiles = async (files: FileList | File[]) => {
    setError("")
    const newArticles: { name: string; text: string }[] = []

    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(txt|md|html|json)$/i)) {
        setError(`不支持的文件类型: ${file.name}，仅支持 .txt / .md / .html`)
        continue
      }
      try {
        const text = await file.text()
        if (text.trim().length < 100) {
          setError(`${file.name} 内容太短（少于100字），请上传完整文章`)
          continue
        }
        newArticles.push({ name: file.name, text: text.trim() })
      } catch {
        setError(`${file.name} 读取失败`)
      }
    }

    if (newArticles.length > 0) {
      setArticles((prev) => [...prev, ...newArticles].slice(0, 10))
    }
  }

  // 拖拽支持
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 开始分析
  const handleAnalyze = async () => {
    if (articles.length < 3) {
      setError("请上传至少3篇文章才能分析风格")
      return
    }
    setAnalyzing(true)
    setError("")

    try {
      const res = await fetch("/api/style/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: articles.map((a) => a.text) }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setProfile(data.profile)
        setHasExisting(true)
        // 保存到服务器
        await fetch("/api/style/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: data.profile }),
        })
      }
    } catch {
      setError("分析失败，请检查网络后重试")
    } finally {
      setAnalyzing(false)
    }
  }

  // 清除风格
  const handleClear = async () => {
    if (!confirm("确定要清除风格档案吗？")) return
    await fetch("/api/style/profile", { method: "DELETE" })
    setProfile(null)
    setHasExisting(false)
    setArticles([])
  }

  const profileLabels: Record<keyof StyleProfile, string> = {
    sentenceStyle: "句式特点",
    vocabulary: "词汇偏好",
    paragraphStructure: "段落结构",
    tone: "语气调性",
    rhetoric: "常用修辞",
    rhythm: "文章节奏",
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 当前风格 */}
      {loaded && profile && (
        <div className="bg-red-950/20 rounded-xl border border-red-900/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-300 flex items-center gap-2">
              <Sparkles size={18} /> 你的写作风格档案
            </h3>
            <button onClick={handleClear} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
              清除档案
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(profileLabels) as (keyof StyleProfile)[]).map((key) => (
              <div key={key} className="bg-zinc-900/50 rounded-lg p-3">
                <span className="text-xs text-zinc-500">{profileLabels[key]}</span>
                <p className="text-sm text-zinc-300 mt-0.5">{profile[key]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-700 hover:border-red-900/50 p-8 text-center cursor-pointer transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.html"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload size={36} className="mx-auto mb-3 text-zinc-600" />
        <p className="text-zinc-300 font-medium">点击选择或拖拽文章文件到此处</p>
        <p className="text-zinc-600 text-sm mt-1">支持 .txt / .md / .html 格式，每篇至少100字</p>
      </div>

      {/* 文章列表 */}
      {articles.length > 0 && (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-zinc-200">
              已上传 {articles.length} 篇文章
              {articles.length < 3 && <span className="text-yellow-400 text-sm ml-2">（还需至少 {3 - articles.length} 篇）</span>}
            </h3>
          </div>
          <div className="space-y-2">
            {articles.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-zinc-300 truncate">{a.name}</span>
                  <span className="text-xs text-zinc-600 shrink-0">({a.text.length}字)</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setArticles((prev) => prev.filter((_, j) => j !== i))
                  }}
                  className="text-zinc-500 hover:text-red-400 transition-colors ml-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || articles.length < 3}
            className="mt-4 w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                AI 正在分析你的写作风格...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                开始分析风格 ({articles.length}篇)
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg p-3">
          <XCircle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}
