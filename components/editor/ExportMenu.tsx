"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileText, FileCode2, FileArchive, Printer, Smartphone, Copy, Check } from "lucide-react"
import { processForWechat } from "@/lib/wechat-format"

interface Props {
  /** 原始 markdown 或纯文本内容 */
  content: string
  /** 编辑器 DOM 引用（用于获取格式化后的 HTML） */
  editorRef?: React.RefObject<HTMLDivElement | null>
}

export function ExportMenu({ content, editorRef }: Props) {
  const [open, setOpen] = useState(false)
  const [wechatCopied, setWechatCopied] = useState(false)
  const [wechatWarnings, setWechatWarnings] = useState<string[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const getEditedHtml = () => {
    return editorRef?.current?.innerHTML || content
  }

  const getEditedText = () => {
    return editorRef?.current?.innerText || content
  }

  /** 导出 TXT */
  const exportTxt = () => {
    const text = getEditedText()
    downloadFile(text, "article.txt", "text/plain")
    setOpen(false)
  }

  /** 导出 Markdown */
  const exportMarkdown = () => {
    const html = getEditedHtml()
    const md = htmlToMarkdown(html)
    downloadFile(md, "article.md", "text/markdown")
    setOpen(false)
  }

  /** 导出 DOCX */
  const exportDocx = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
      const text = getEditedText()
      // 按空行分段
      const paragraphs = text.split("\n").filter(Boolean)

      const children = paragraphs.map((para) => {
        // 判断是否为标题（以 # 或 ** 开头）
        const isHeading = /^#{1,3}\s/.test(para) || /^\*\*.*\*\*$/.test(para.trim())
        const cleanText = para.replace(/^#{1,3}\s/, "").replace(/^\*\*|\*\*$/g, "")
        return new Paragraph({
          children: [new TextRun({ text: cleanText, size: 24 })],
          heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
          spacing: { after: 200 },
        })
      })

      const doc = new Document({
        sections: [{ properties: {}, children }],
      })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = "article.docx"; a.click()
      URL.revokeObjectURL(url)
    } catch {
      // docx 加载失败时降级为 HTML 下载
      downloadFile(getEditedHtml(), "article.html", "text/html")
    }
    setOpen(false)
  }

  /** 导出 PDF（浏览器打印） */
  const exportPdf = () => {
    const html = getEditedHtml()
    const w = window.open("", "_blank")
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印</title>
        <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.8;color:#333}
        h1,h2,h3{color:#111} @media print{body{margin:20mm}}</style></head><body>${html}</body></html>`)
      w.document.close()
      w.onload = () => w.print()
    }
    setOpen(false)
  }

  /** 公众号排版并复制 */
  const exportWechat = () => {
    const text = getEditedText()
    const { text: formatted, warnings } = processForWechat(text)
    setWechatWarnings(warnings)
    navigator.clipboard.writeText(formatted)
    setWechatCopied(true)
    setTimeout(() => setWechatCopied(false), 3000)
    setOpen(false)
  }

  const items = [
    { label: "纯文本 (.txt)", icon: FileText, onClick: exportTxt },
    { label: "Markdown (.md)", icon: FileCode2, onClick: exportMarkdown },
    { label: "Word (.docx)", icon: FileArchive, onClick: exportDocx },
    { label: "PDF 打印", icon: Printer, onClick: exportPdf },
    { label: wechatCopied ? "已复制!" : "公众号排版", icon: wechatCopied ? Check : Smartphone, onClick: exportWechat },
  ]
  const hasWarnings = wechatWarnings.length > 0

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
      >
        <Download size={16} />
        导出
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-left"
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
          {hasWarnings && (
            <div className="px-4 py-2 text-xs text-yellow-400 border-t border-zinc-700">
              ⚠️ 检测到敏感词：{wechatWarnings.join("、")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 下载文件 */
function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/** HTML 转基础 Markdown */
function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
  return md.trim()
}
