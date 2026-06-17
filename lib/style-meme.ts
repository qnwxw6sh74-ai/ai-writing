/**
 * 风格模因库 — 用户标志性短句的加载、选择、注入
 *
 * 生成文章时随机抽取 1-2 个 meme，要求 AI 自然融入文中
 */

import pool from "@/lib/db"

interface StyleMeme {
  id: number
  phrase: string
  context: string
  typicalUsage: string
  usageCount: number
}

/** 获取用户的活跃 memes（按 usage_count 升序，均衡使用） */
export async function getMemesForUser(userId: number): Promise<StyleMeme[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT m.id, m.phrase, m.context_preview AS context, m.typical_usage AS typicalUsage,
              m.usage_count AS usageCount
       FROM user_style_memes m
       JOIN user_styles s ON m.style_profile_id = s.id
       WHERE m.user_id = ? AND m.is_active = 1 AND s.is_active = 1
       ORDER BY m.usage_count ASC, m.sort_rank ASC
       LIMIT 10`,
      [userId]
    ) as any[]
    return rows.map((r: any) => ({
      id: r.id,
      phrase: r.phrase,
      context: r.context || "",
      typicalUsage: r.typicalUsage || "",
      usageCount: r.usageCount || 0,
    }))
  } catch (e) {
    console.error("[style-meme] getMemesForUser error:", e)
    return []
  }
}

/** 从 meme 列表中随机选择 count 个 */
export function selectRandomMemes(memes: StyleMeme[], count: number = 2): StyleMeme[] {
  if (memes.length === 0) return []
  const n = Math.min(count, memes.length)
  // Fisher-Yates shuffle 取前 n 个
  const shuffled = [...memes]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, n)
}

/** 构建模因注入指令 */
export function buildMemePrompt(selected: StyleMeme[]): string {
  if (selected.length === 0) return ""

  const memeItems = selected.map(m =>
    `「${m.phrase}」${m.typicalUsage ? `（通常在：${m.typicalUsage}）` : ""}`
  ).join("\n")

  return `【个人风格模因】请在文章中自然地融入以下标志性短句（选 ${selected.length} 处自然插入，不要全部堆在开头或结尾，不要生硬插入）。这些是作者的个人口头禅/签名句式，融入后会让文章更像真人写的：

${memeItems}`
}

/**
 * 记录 meme 使用（生成成功后调用）
 */
export async function recordMemeUsage(memeIds: number[]): Promise<void> {
  if (memeIds.length === 0) return
  try {
    await pool.execute(
      `UPDATE user_style_memes SET usage_count = usage_count + 1 WHERE id IN (${memeIds.map(() => "?").join(",")})`,
      memeIds
    )
  } catch (e) {
    console.error("[style-meme] recordMemeUsage error:", e)
  }
}
