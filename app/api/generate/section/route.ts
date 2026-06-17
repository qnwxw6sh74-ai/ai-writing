import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { augmentSystemPrompt } from "@/lib/style-prompt-builder"
import { recordMemeUsage } from "@/lib/style-meme"
import { getUserFromRequest } from "@/lib/auth-user"
import pool from "@/lib/db"

export const maxDuration = 60

/**
 * POST /api/generate/section
 * 生成单段内容，带上下文连贯性
 * Body: { outlineId, sectionIndex, modelId? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { outlineId, sectionIndex, modelId } = await request.json()
    if (!outlineId || sectionIndex === undefined || sectionIndex === null) {
      return NextResponse.json({ error: "缺少 outlineId 或 sectionIndex" }, { status: 400 })
    }

    // === 加载大纲 ===
    const [rows] = await pool.execute(
      `SELECT id, user_id, keyword, domain, style, word_count, title, sections, section_contents, credits_deducted
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

    const prevContent = sectionIndex > 0 ? sectionContents[String(sectionIndex - 1)] || "" : ""

    // === 积分检查（第一段时扣费） ===
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

    if (!outline.credits_deducted) {
      const creditsCheck = await checkCredits(userId, ip)
      if (!creditsCheck.allowed) {
        return NextResponse.json(
          { error: "额度不足，请购买套餐继续使用", code: "NO_CREDITS" },
          { status: 402 }
        )
      }
      // 扣积分
      await deductCredits(userId, ip, "generate")
      await pool.execute(
        `UPDATE generate_outlines SET credits_deducted = 1 WHERE id = ?`,
        [outlineId]
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

    // === 保存段落 ===
    sectionContents[String(sectionIndex)] = content
    try {
      await pool.execute(
        `UPDATE generate_outlines SET section_contents = ?, status = 'generating' WHERE id = ?`,
        [JSON.stringify(sectionContents), outlineId]
      )
    } catch { /* ignore */ }

    // 记录 meme
    if (usedMemeIds.length > 0) {
      recordMemeUsage(usedMemeIds).catch(() => {})
    }

    return NextResponse.json({
      sectionIndex,
      heading: section.heading,
      content,
    })
  } catch (e) {
    console.error("[section] error:", e)
    return NextResponse.json({ error: "段落生成失败，请稍后重试" }, { status: 500 })
  }
}
