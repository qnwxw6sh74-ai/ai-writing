/**
 * AI 味禁语库 — 从 ai_forbidden_phrases 表加载，内存缓存 5 分钟
 *
 * 用于在 System Prompt 中追加【严禁使用的 AI 味短语】指令
 */

import pool from "@/lib/db"

interface ForbiddenPhrase {
  phrase: string
  category: string
  severity: "hard" | "soft"
}

let cachedPhrases: ForbiddenPhrase[] = []
let cacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 分钟

/** 获取所有活跃禁语 */
export async function getForbiddenPhrases(): Promise<ForbiddenPhrase[]> {
  const now = Date.now()
  if (cachedPhrases && now - cacheTime < CACHE_TTL_MS) {
    return cachedPhrases
  }

  try {
    const [rows] = await pool.execute(
      `SELECT phrase, category, severity FROM ai_forbidden_phrases WHERE is_active = 1 ORDER BY severity, id`
    ) as any[]
    cachedPhrases = rows.map((r: any) => ({
      phrase: r.phrase,
      category: r.category || "",
      severity: r.severity as "hard" | "soft",
    }))
    cacheTime = now
    return cachedPhrases
  } catch (e) {
    console.error("[forbidden-phrases] DB query failed, using cached:", e)
    return cachedPhrases || [] // 降级到缓存
  }
}

/** 构建 System Prompt 追加指令 */
export async function buildForbiddenPrompt(): Promise<string> {
  const phrases = await getForbiddenPhrases()
  if (phrases.length === 0) return ""

  const hardList = phrases.filter(p => p.severity === "hard")
  const softList = phrases.filter(p => p.severity === "soft")

  const parts: string[] = []
  parts.push("【AI 味禁语库 — 请严格避免以下表达】")

  if (hardList.length > 0) {
    parts.push(`严禁使用：${hardList.map(p => `"${p.phrase}"`).join("、")}`)
  }
  if (softList.length > 0) {
    parts.push(`建议避免：${softList.map(p => `"${p.phrase}"`).join("、")}`)
  }

  parts.push("这些是低质量 AI 文章的典型特征，使用它们会破坏文章的真实感和可读性。请用更自然、更有人味的方式表达。")

  return parts.join("\n")
}

/** 清除缓存（管理后台修改禁语后调用） */
export function clearForbiddenPhrasesCache(): void {
  cachedPhrases = []
  cacheTime = 0
}
