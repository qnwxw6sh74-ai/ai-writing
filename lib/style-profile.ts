/**
 * 用户风格档案 CRUD — 操作 user_styles 和 user_style_memes 表
 *
 * 替代 site_config 中的 user_style_{userId} key-value 存储
 */

import pool from "@/lib/db"

// ---- 类型 ----

/** 9 维度风格档案（AI 返回的原始文本） */
export interface StyleProfile {
  avgSentenceLength: string
  sentencePatterns: string
  vocabularyPrefs: string
  openingStyle: string
  endingStyle: string
  punctuationEmojiHabits: string
  emotionalTemperature: string
  personUsage: string
  readerRelationship: string
}

/** 标志性短句 */
export interface StyleMeme {
  id?: number
  phrase: string
  context: string
  typicalUsage: string
  usageCount?: number
}

/** 完整风格档案（含元数据） */
export interface StyleProfileFull {
  id: number
  userId: number
  profile: StyleProfile
  sourceArticleCount: number
  sourceArticlePreviews: string[] | null
  version: number
  createdAt: string
  updatedAt: string
  memes: StyleMeme[]
}

// ---- 维度标签映射 ----

export const PROFILE_LABELS: Record<keyof StyleProfile, string> = {
  avgSentenceLength: "平均句长特征",
  sentencePatterns: "常用句式特征",
  vocabularyPrefs: "词汇偏好",
  openingStyle: "开头方式偏好",
  endingStyle: "结尾方式偏好",
  punctuationEmojiHabits: "标点与表情习惯",
  emotionalTemperature: "情感温度",
  personUsage: "人称使用",
  readerRelationship: "读者关系设定",
}

/** 从 user_styles 读取活跃档案（含 memes） */
export async function getStyleProfile(userId: number): Promise<StyleProfileFull | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, profile, source_article_count, source_article_previews, version, created_at, updated_at
       FROM user_styles WHERE user_id = ? AND is_active = 1 ORDER BY version DESC LIMIT 1`,
      [userId]
    ) as any[]

    if (rows.length === 0) return null

    const row = rows[0]
    let profile: StyleProfile
    try {
      profile = typeof row.profile === "string" ? JSON.parse(row.profile) : row.profile
    } catch {
      return null
    }

    // 读取 memes
    const [memeRows] = await pool.execute(
      `SELECT id, phrase, context_preview AS context, typical_usage AS typicalUsage, usage_count AS usageCount
       FROM user_style_memes WHERE user_id = ? AND style_profile_id = ? AND is_active = 1
       ORDER BY sort_rank LIMIT 10`,
      [userId, row.id]
    ) as any[]

    let sourcePreviews: string[] | null = null
    try {
      sourcePreviews = row.source_article_previews
        ? (typeof row.source_article_previews === "string" ? JSON.parse(row.source_article_previews) : row.source_article_previews)
        : null
    } catch { /* ignore */ }

    return {
      id: row.id,
      userId: row.user_id,
      profile,
      sourceArticleCount: row.source_article_count || 0,
      sourceArticlePreviews: sourcePreviews,
      version: row.version || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      memes: memeRows,
    }
  } catch (e) {
    console.error("[style-profile] getStyleProfile error:", e)
    return null
  }
}

/** 写入/更新风格档案 + memes */
export async function saveStyleProfile(
  userId: number,
  profile: StyleProfile,
  memes: { phrase: string; context: string; typicalUsage: string; sortRank?: number }[],
  sourcePreviews?: string[],
  sourceCount?: number,
  aiRawOutput?: string,
): Promise<StyleProfileFull | null> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 1. 将旧档案标记为非活跃
    await conn.execute(
      `UPDATE user_styles SET is_active = 0 WHERE user_id = ? AND is_active = 1`,
      [userId]
    )

    // 2. 获取新版本号
    const [verRows] = await conn.execute(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_ver FROM user_styles WHERE user_id = ?`,
      [userId]
    ) as any[]
    const version = verRows[0]?.next_ver || 1

    // 3. 插入新档案
    const [insertResult] = await conn.execute(
      `INSERT INTO user_styles (user_id, profile, source_article_count, source_article_previews, ai_raw_output, version)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(profile),
        sourceCount || 0,
        sourcePreviews ? JSON.stringify(sourcePreviews) : null,
        aiRawOutput || null,
        version,
      ]
    ) as any[]
    const profileId = insertResult.insertId

    // 4. 删除旧 memes
    await conn.execute(
      `UPDATE user_style_memes SET is_active = 0 WHERE user_id = ? AND is_active = 1`,
      [userId]
    )

    // 5. 插入新 memes
    for (let i = 0; i < memes.length; i++) {
      const m = memes[i]
      if (!m.phrase || !m.phrase.trim()) continue
      await conn.execute(
        `INSERT INTO user_style_memes (user_id, style_profile_id, phrase, context_preview, typical_usage, sort_rank)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, profileId, m.phrase.trim(), m.context || "", m.typicalUsage || "", m.sortRank ?? i]
      )
    }

    await conn.commit()

    // 6. 读取完整档案返回
    const [newRows] = await conn.execute(
      `SELECT id, user_id, profile, source_article_count, source_article_previews, version, created_at, updated_at
       FROM user_styles WHERE id = ?`,
      [profileId]
    ) as any[]
    const row = newRows[0]

    let parsedProfile: StyleProfile
    try {
      parsedProfile = typeof row.profile === "string" ? JSON.parse(row.profile) : row.profile
    } catch {
      parsedProfile = profile
    }

    const [memeRows] = await conn.execute(
      `SELECT id, phrase, context_preview AS context, typical_usage AS typicalUsage, usage_count AS usageCount
       FROM user_style_memes WHERE user_id = ? AND style_profile_id = ? AND is_active = 1
       ORDER BY sort_rank`,
      [userId, profileId]
    ) as any[]

    return {
      id: row.id,
      userId: row.user_id,
      profile: parsedProfile,
      sourceArticleCount: row.source_article_count || 0,
      sourceArticlePreviews: row.source_article_previews ? JSON.parse(row.source_article_previews) : null,
      version: row.version || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      memes: memeRows,
    }
  } catch (e) {
    await conn.rollback()
    console.error("[style-profile] saveStyleProfile error:", e)
    return null
  } finally {
    conn.release()
  }
}

/** 软删除风格档案 */
export async function deleteStyleProfile(userId: number): Promise<boolean> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(`UPDATE user_styles SET is_active = 0 WHERE user_id = ? AND is_active = 1`, [userId])
    await conn.execute(`UPDATE user_style_memes SET is_active = 0 WHERE user_id = ? AND is_active = 1`, [userId])
    await conn.commit()
    return true
  } catch (e) {
    await conn.rollback()
    console.error("[style-profile] deleteStyleProfile error:", e)
    return false
  } finally {
    conn.release()
  }
}

/**
 * 从 site_config 迁移旧风格数据到 user_styles
 * 仅在新表无数据时执行
 */
export async function migrateFromSiteConfig(userId: number): Promise<StyleProfileFull | null> {
  try {
    // 检查是否已有新表数据
    const [existing] = await pool.execute(
      `SELECT id FROM user_styles WHERE user_id = ? AND is_active = 1 LIMIT 1`,
      [userId]
    ) as any[]
    if (existing.length > 0) return null // 已有数据，无需迁移

    // 读取旧数据
    const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")
    const [oldRows] = await pool.execute(
      `SELECT value FROM site_config WHERE \`key\` = ?`,
      [`user_style_${safeId}`]
    ) as any[]

    if (oldRows.length === 0) return null

    let oldProfile: Record<string, string>
    try {
      oldProfile = typeof oldRows[0].value === "string"
        ? JSON.parse(oldRows[0].value)
        : oldRows[0].value
    } catch {
      return null
    }

    // 映射旧 6 维到新 9 维
    const profile: StyleProfile = {
      avgSentenceLength: oldProfile.sentenceStyle || oldProfile.avgSentenceLength || "",
      sentencePatterns: oldProfile.rhetoric || oldProfile.sentencePatterns || "",
      vocabularyPrefs: oldProfile.vocabulary || oldProfile.vocabularyPrefs || "",
      openingStyle: "",
      endingStyle: "",
      punctuationEmojiHabits: "",
      emotionalTemperature: oldProfile.tone || oldProfile.emotionalTemperature || "",
      personUsage: "",
      readerRelationship: "",
    }

    const result = await saveStyleProfile(
      userId,
      profile,
      [], // 旧数据没有 memes
      undefined,
      undefined,
      JSON.stringify(oldProfile),
    )

    if (result) {
      console.log(`[style-profile] 已从 site_config 迁移 user_style_${safeId} → user_styles id=${result.id}`)
    }
    return result
  } catch (e) {
    console.error("[style-profile] migrateFromSiteConfig error:", e)
    return null
  }
}
