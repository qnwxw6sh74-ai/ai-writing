import { formatDate } from "@/lib/utils"

interface Message {
  id: number
  nickname: string
  content: string
  created_at: string
}

interface Props {
  messages: Message[]
}

export function GuestbookList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-12 text-center">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-zinc-500">暂无留言，来做第一个留言的人吧！</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-zinc-200 text-sm">{msg.nickname}</span>
            <span className="text-xs text-zinc-600">{formatDate(msg.created_at)}</span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
