import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { checkCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { augmentSystemPrompt } from "@/lib/style-prompt-builder"
import { recordMemeUsage } from "@/lib/style-meme"
import { getUserFromRequest } from "@/lib/auth-user"
import pool from "@/lib/db"

export const maxDuration = 60

// ====== 段落重写次数限制（内存，服务重启重置）======
const sectionRewriteTracker = new Map<string, { count: number }>()
const MAX_SECTION_REWRITES = 5

function checkSectionRewriteLimit(outlineId: number, sectionIndex: number): { allowed: boolean; used: number; remaining: number } {
  const key = `${outlineId}:${sectionIndex}`
  const entry = sectionRewriteTracker.get(key)
  const used = entry?.count || 0
  return {
    allowed: used < MAX_SECTION_REWRITES,
    used,
    remaining: Math.max(0, MAX_SECTION_REWRITES - used),
  }
}

function recordSectionRewrite(outlineId: number, sectionIndex: number): void {
  const key = `${outlineId}:${sectionIndex}`
  const entry = sectionRewriteTracker.get(key)
  if (entry) {
    entry.count++
  } else {
    sectionRewriteTracker.set(key, { count: 1 })
  }
}

// 首次生成不算重写，清除重写计数
function resetSectionRewrite(outlineId: number, sectionIndex: number): void {
  sectionRewriteTracker.delete(`${outlineId}:${sectionIndex}`)
}

/**
 * POST /api/generate/section
 * 生成单段内容，带上下文连贯性
 * Body: { outlineId, sectionIndex, modelId?, isRewrite? }
 *
 * 积分策略：不在此扣费。积分在 /api/generate/assemble 时扣除。
 * 每段最多重写 5 次。
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { outlineId, sectionIndex, modelId, isRewrite } = await request.json()
    if (!outlineId || sectionIndex === undefined || sectionIndex === null) {
      return NextResponse.json({ error: "缺少 outlineId 或 sectionIndex" }, { status: 400 })
    }

    // ====== 重写次数检查 ======
    if (isRewrite) {
      const rewriteCheck = checkSectionRewriteLimit(outlineId, sectionIndex)
      if (!rewriteCheck.allowed) {
        return NextResponse.json(
          { error: `该段落重写次数已用完（${MAX_SECTION_REWRITES}次）`, remaining: 0 },
          { status: 429 }
        )
      }
    }

    // === 加载大纲 ===
    const [rows] = await pool.execute(
      `SELECT id, user_id, keyword, domain, style, word_count, title, sections, section_contents, section_versions
       FROM generate_outlines WHERE id = ? AND user_id = ?`,
      [outlineId, user.userId]
    ) as any[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "大纲不存在" }, { status: 404 })
    }

    const outline = rows[0]
    let sections: any[]
    try {
      sections = typeof outline.sections === "string" ? JSON.parse(outline.sections) : outline.sections
    } catch {
      return NextResponse.json({ error: "大纲数据损坏" }, { status: 500 })
    }

    const section = sections[sectionIndex]
    if (!section) {
      return NextResponse.json({ error: "段落索引无效" }, { status: 400 })
    }

    // 已生成的内容
    let sectionContents: Record<string, string> = {}
    try {
      sectionContents = outline.section_contents
        ? (typeof outline.section_contents === "string" ? JSON.parse(outline.section_contents) : outline.section_contents)
        : {}
    } catch { /* ignore */ }

    // 版本历史
    let sectionVersions: Record<string, { content: string; createdAt: string }[]> = {}
    try {
      sectionVersions = outline.section_versions
        ? (typeof outline.section_versions === "string" ? JSON.parse(outline.section_versions) : outline.section_versions)
        : {}
    } catch { /* ignore */ }

    const prevContent = sectionIndex > 0 ? sectionContents[String(sectionIndex - 1)] || "" : ""

    // === 积分检查（仅检查，不扣费。扣费在 assemble） ===
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

    const creditsCheck = await checkCredits(userId, ip, "generate")
    if (!creditsCheck.allowed) {
      const msg = creditsCheck.isLoggedIn
        ? "额度已用完，请购买套餐继续使用"
        : `免费次数已用完（${creditsCheck.freeQuotaUsed}/${creditsCheck.freeQuotaTotal}），请登录后购买套餐`
      return NextResponse.json(
        { error: msg, code: "NO_CREDITS" },
        { status: 402 }
      )
    }

    // === 构建 Prompt ===
    let systemPrompt = "你是公众号爆文创作者。请撰写指定段落，与前后段落保持连贯。"
    try {
      const [tRows] = await pool.execute(
        `SELECT system_prompt FROM prompt_templates WHERE type = 'article' AND is_active = 1 AND (domain = ? OR domain = '通用') ORDER BY sort_order LIMIT 1`,
        [outline.domain || "通用"]
      ) as any[]
      if (tRows.length > 0 && tRows[0].system_prompt) {
        systemPrompt = tRows[0].system_prompt
      }
    } catch { /* fallback */ }

    // 风格 + 禁语 + 模因（每段仅选1个 meme）
    const augmented = await augmentSystemPrompt(systemPrompt, user.userId, 1)
    systemPrompt = augmented.systemPrompt
    const usedMemeIds = augmented.usedMemeIds

    // 上下文：大纲 + 前一段内容
    const outlineContext = `【文章标题】${outline.title}\n【全文大纲】\n${sections.map((s: any, i: number) => `${i === sectionIndex ? '>>> ' : ''}${i + 1}. ${s.heading}（约${s.estimatedWords}字）${s.keyPoints ? `— ${s.keyPoints}` : ''}${i === sectionIndex ? ' <<<' : ''}`).join("\n")}`
    const userPrompt = `${outlineContext}\n\n【前一段内容（供连贯参考）】${prevContent || "（无，这是第一段）"}\n\n请撰写上述大纲中用 >>> 标记的段落。要求：\n1. 单独成段，开头不需标题\n2. 字数约 ${section.estimatedWords || 300} 字\n3. 与前后段落自然衔接\n4. ${outline.style || "通俗易懂"}风格，${outline.domain || "通用"}领域`

    // === AI 调用 ===
    const resolvedModel = await resolveModel(outline.keyword, modelId)
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const content = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { ...overrides, temperature: 0.75, maxTokens: 2000 }
    )

    if (!content) {
      return NextResponse.json({ error: "段落生成失败，请稍后重试" }, { status: 500 })
    }

    // ====== 版本历史处理 ======
    const key = String(sectionIndex)
    const oldContent = sectionContents[key]

    if (isRewrite && oldContent) {
      // 将旧版本存入版本历史
      const versions = sectionVersions[key] || []
      versions.push({ content: oldContent, createdAt: new Date().toISOString() })
      sectionVersions[key] = versions
      // 记录重写次数
      recordSectionRewrite(outlineId, sectionIndex)
    } else {
      // 首次生成，清除可能残留的重写计数
      resetSectionRewrite(outlineId, sectionIndex)
    }

    // === 保存段落 + 版本历史（原子操作） ===
    try {
      // JSON path 用字符串拼接（sectionIndex 始终是数字，无注入风险）
      await pool.execute(
        `UPDATE generate_outlines
         SET section_contents = JSON_SET(COALESCE(section_contents, '{}'), '$.${sectionIndex}', ?),
             section_versions = COALESCE(section_versions, '{}'),
             status = 'generating'
         WHERE id = ?`,
        [content, outlineId]
      )
      // 单独更新 section_versions（避免 JSON.stringify 与主更新互相影响）
      if (Object.keys(sectionVersions).length > 0) {
        await pool.execute(
          `UPDATE generate_outlines SET section_versions = ? WHERE id = ?`,
          [JSON.stringify(sectionVersions), outlineId]
        )
      }
    } catch (e) {
      console.error("[section] 保存失败:", e)
    }

    // 记录 meme
    if (usedMemeIds.length > 0) {
      recordMemeUsage(usedMemeIds).catch(() => {})
    }

    const rewriteCheck = checkSectionRewriteLimit(outlineId, sectionIndex)

    return NextResponse.json({
      sectionIndex,
      heading: section.heading,
      content,
      versions: sectionVersions[key] || [],
      rewriteUsed: rewriteCheck.used,
      rewriteRemaining: rewriteCheck.remaining,
    })
  } catch (e) {
    console.error("[section] error:", e)
    return NextResponse.json({ error: "段落生成失败，请稍后重试" }, { status: 500 })
  }
}
