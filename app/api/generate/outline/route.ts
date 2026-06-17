import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { checkCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { augmentSystemPrompt } from "@/lib/style-prompt-builder"
import { getUserFromRequest } from "@/lib/auth-user"
import pool from "@/lib/db"

export const maxDuration = 30

/**
 * POST /api/generate/outline
 * 生成文章大纲（标题 + 5-8段小标题），不扣积分
 * Body: { keyword, domain, style, wordCount, modelId? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { keyword, domain, style, wordCount, modelId } = await request.json()

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 })
    }
    if (keyword.length > 200) {
      return NextResponse.json({ error: "关键词过长，最多200字" }, { status: 400 })
    }

    const userId = user ? String(user.userId) : getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

    // 额度检查（大纲生成免费，仅检查是否有额度）
    const creditsCheck = await checkCredits(userId, ip)
    if (!creditsCheck.allowed) {
      return NextResponse.json(
        { error: "额度不足，请购买套餐继续使用", code: "NO_CREDITS" },
        { status: 402 }
      )
    }

    // === 加载 Prompt 模板 ===
    let systemPrompt = "你是公众号内容策划专家。请生成文章大纲。"
    let userPromptTemplate = "请为「{keyword}」生成大纲，{wordCount}字，{style}风格。"
    try {
      const [rows] = await pool.execute(
        `SELECT system_prompt, user_prompt_template FROM prompt_templates
         WHERE type = 'outline' AND is_active = 1 ORDER BY sort_order LIMIT 1`
      ) as any[]
      if (rows.length > 0) {
        systemPrompt = rows[0].system_prompt || systemPrompt
        userPromptTemplate = rows[0].user_prompt_template || userPromptTemplate
      }
    } catch { /* fallback */ }

    // === 加载风格 + 禁语 ===
    const augmented = await augmentSystemPrompt(systemPrompt, user?.userId ?? 0, 0)
    systemPrompt = augmented.systemPrompt

    // === 构建用户 Prompt ===
    const userPrompt = userPromptTemplate
      .replace(/{keyword}/g, keyword.trim())
      .replace(/{style}/g, style || "通俗易懂")
      .replace(/{wordCount}/g, String(wordCount || 1500))
      .replace(/{domain}/g, domain || "通用")

    // === AI 调用 ===
    const resolvedModel = await resolveModel(keyword, modelId)
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { ...overrides, temperature: 0.7, maxTokens: 1500 }
    )

    if (!result) {
      return NextResponse.json({ error: "大纲生成失败，请稍后重试" }, { status: 500 })
    }

    // 解析 JSON
    let jsonStr = result
    const match = result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) jsonStr = match[1].trim()
    let parsed: any
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objMatch) {
        try { parsed = JSON.parse(objMatch[0]) } catch { /* fall through */ }
      }
      if (!parsed) {
        return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 500 })
      }
    }

    const title = parsed.title || `${keyword}`
    const sections: { heading: string; estimatedWords: number; keyPoints: string }[] =
      (parsed.sections || []).map((s: any, i: number) => ({
        heading: s.heading || `第${i + 1}段`,
        estimatedWords: Number(s.estimatedWords) || Math.floor((wordCount || 1500) / (parsed.sections?.length || 6)),
        keyPoints: s.keyPoints || "",
      }))

    if (sections.length < 3) {
      return NextResponse.json({ error: "大纲段落数不足，请重试" }, { status: 500 })
    }

    // === 保存到 DB ===
    let outlineId = 0
    try {
      const [insertResult] = await pool.execute(
        `INSERT INTO generate_outlines (user_id, keyword, domain, style, word_count, title, sections, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [uid || 0, keyword.trim(), domain || "", style || "", wordCount || 1500, title, JSON.stringify(sections)]
      ) as any[]
      outlineId = insertResult.insertId
    } catch (e) {
      console.error("[outline] DB insert failed:", e)
    }

    return NextResponse.json({
      outlineId,
      title,
      sections: sections.map((s, i) => ({ ...s, orderIndex: i })),
    })
  } catch (e) {
    console.error("[outline] error:", e)
    return NextResponse.json({ error: "大纲生成失败，请稍后重试" }, { status: 500 })
  }
}
