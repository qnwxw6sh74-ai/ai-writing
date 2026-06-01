import type { Metadata } from "next"
import pool from "@/lib/db"

export const metadata: Metadata = {
  title: "更新日志 - AI公众号爆文网",
  description: "公众号爆文生成器版本更新记录。",
}

// 静态备用数据
const fallbackLogs = [
  { version: "v1.0.0", published_at: "2025-05-01", changes: ["🚀 公众号爆文生成器正式上线", "✍️ AI智能文章生成", "🎨 黑红极简设计", "📱 移动端适配"] },
]

export default async function ChangelogPage() {
  let logs: { id: number; version: string; changes: string; published_at: string }[] = []

  try {
    const [rows] = await pool.execute(
      "SELECT id, version, changes, published_at FROM changelogs ORDER BY published_at DESC"
    )
    logs = rows as any[]
  } catch {
    // 数据库不可用
  }

  // 如果数据库为空，使用备用数据
  if (logs.length === 0) {
    logs = fallbackLogs.map((l, i) => ({
      id: i,
      version: l.version,
      changes: JSON.stringify(l.changes),
      published_at: l.published_at,
    }))
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">📋 更新日志</h1>
        <p className="text-zinc-400 mb-8">记录产品的每一次成长与变化</p>
        <div className="space-y-8">
          {logs.map((log) => {
            const items: string[] = (() => { try { return JSON.parse(log.changes) } catch { return [log.changes] } })()
            return (
              <div key={log.id} className="relative pl-8 border-l-2 border-red-900/30">
                <div className="absolute -left-2 top-0 w-4 h-4 bg-red-600 rounded-full border-2 border-zinc-950" />
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-red-950 text-red-300 font-bold px-3 py-1 rounded-full text-sm border border-red-900/30">{log.version}</span>
                    <span className="text-zinc-500 text-sm">{(() => { try { return new Date(log.published_at).toISOString().split("T")[0] } catch { return String(log.published_at || "") } })()}</span>
                  </div>
                  <ul className="space-y-2">
                    {Array.isArray(items) && items.map((item: string, i: number) => (
                      <li key={i} className="text-zinc-400 text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
