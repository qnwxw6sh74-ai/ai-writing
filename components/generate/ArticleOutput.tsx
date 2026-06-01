"use client"

import { useRef } from "react"
import { ArticleEditor } from "@/components/editor/ArticleEditor"
import { ExportMenu } from "@/components/editor/ExportMenu"

interface Props {
  content: string
}

export function ArticleOutput({ content }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mt-6 mb-2">
        <ExportMenu content={content} editorRef={editorRef} />
      </div>
      <ArticleEditor content={content} />
    </div>
  )
}
