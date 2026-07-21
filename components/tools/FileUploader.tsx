"use client"

import { useState } from "react"
import { Upload, X, FileText, Image } from "lucide-react"

interface FileUploaderProps {
  toolId: string
  accepts: string[]
  maxFiles?: number
  onUploadComplete: (files: File[]) => void
}

export function FileUploader({ toolId, accepts, maxFiles = 10, onUploadComplete }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return accepts.includes(ext!)
    })

    if (files.length === 0) {
      setError(`不支持的文件格式，请选择 ${accepts.join(', ')} 文件`)
      return
    }

    if (files.length > maxFiles) {
      setError(`最多上传 ${maxFiles} 个文件`)
      return
    }

    setUploading(true)
    setError("")

    try {
      onUploadComplete(files)
    } catch (err) {
      setError("上传失败")
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return accepts.includes(ext!)
    })

    if (files.length === 0) {
      setError(`不支持的文件格式，请选择 ${accepts.join(', ')} 文件`)
      return
    }

    if (files.length > maxFiles) {
      setError(`最多上传 ${maxFiles} 个文件`)
      return
    }

    setUploading(true)
    setError("")

    try {
      onUploadComplete(files)
    } catch (err) {
      setError("上传失败")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? "border-red-500 bg-red-950/20" : "border-zinc-700 hover:border-zinc-600"
        }`}
      >
        <input
          type="file"
          multiple
          accept={accepts.map(a => `.${a}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id={`file-input-${toolId}`}
        />
        <label htmlFor={`file-input-${toolId}`} className="cursor-pointer">
          <Upload size={32} className="mx-auto text-zinc-500 mb-3" />
          <p className="text-sm text-zinc-300">
            拖拽文件到此处，或点击选择
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            支持格式：{accepts.join(", ")}
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-3 px-4 py-2 bg-red-950/50 text-red-300 rounded-lg text-sm border border-red-900/30">
          {error}
        </div>
      )}

      {uploading && (
        <div className="mt-3 text-center text-zinc-500 text-sm">
          上传中...
        </div>
      )}
    </div>
  )
}
