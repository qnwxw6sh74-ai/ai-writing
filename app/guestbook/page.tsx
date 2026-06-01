import type { Metadata } from "next"
import { GuestbookClient } from "./GuestbookClient"

export const metadata: Metadata = {
  title: "留言板 - AI公众号爆文网",
  description: "给我们留言，分享你的使用体验和建议。",
}

export default function GuestbookPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">💬 留言板</h1>
        <p className="text-zinc-400 mb-6">分享你的使用体验、建议或问题，我们会尽快回复</p>
        <GuestbookClient />
      </div>
    </div>
  )
}
