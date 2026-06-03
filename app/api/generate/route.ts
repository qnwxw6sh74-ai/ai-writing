import { NextRequest, NextResponse } from "next/server"
import { generateMockArticle } from "@/lib/mock-ai"
import { generateArticle } from "@/lib/ai-client"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { keyword, domain, style, wordCount, modelId } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 })
    }

    // === 服务端积分检查 ===
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const creditsCheck = await checkCredits(userId, ip)

    if (!creditsCheck.allowed) {
      return NextResponse.json(
        { error: "免费额度已用完，请购买套餐继续使用", code: "NO_CREDITS" },
        { status: 402 }
      )
    }

    // === 解析 AI 模型 ===
    const resolvedModel = await resolveModel(keyword, modelId)
    const modelOverrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const mockMode = process.env.MOCK_AI === "true"
    let content: string | null = null

    // === 真实 AI 模式 ===
    if (!mockMode) {
      let systemPrompt = "你是一个专业的公众号文章写手，擅长创作引爆朋友圈的优质内容。"
      let userPrompt = `请以"${keyword}"为主题，写一篇${style || "情感共鸣"}风格的公众号文章，字数约${wordCount || 1500}字。要求：结构清晰、金句频出、段落分明、结尾引导互动。`

      try {
        const [rows] = await pool.execute(
          "SELECT system_prompt, user_prompt_template FROM prompt_templates WHERE type = 'article' AND is_active = 1 AND (domain = ? OR domain = '通用') ORDER BY sort_order LIMIT 1",
          [domain || "通用"]
        ) as any[]
        if (rows.length > 0) {
          systemPrompt = rows[0].system_prompt || systemPrompt
          userPrompt = (rows[0].user_prompt_template || userPrompt)
            .replace(/{keyword}/g, keyword)
            .replace(/{style}/g, style || "情感共鸣")
            .replace(/{wordCount}/g, String(wordCount || 1500))
            .replace(/{domain}/g, domain || "通用")
        }
      } catch { /* DB 不可用，用默认 prompt */ }

      // 读取用户风格档案
      const styleKey = `user_style_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
      let styleProfile: Record<string, string> | null = null
      try {
        const [styleRows] = await pool.execute(
          "SELECT `value` FROM site_config WHERE `key` = ?",
          [styleKey]
        ) as any[]
        if (styleRows.length > 0 && styleRows[0].value) {
          styleProfile = JSON.parse(styleRows[0].value)
        }
      } catch { /* 无风格档案 */ }

      // 将风格注入 system prompt
      if (styleProfile) {
        const styleDesc = Object.entries(styleProfile)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
        systemPrompt = `${systemPrompt}\n\n【用户风格要求——请严格按以下风格写作】\n${styleDesc}`
      }

      content = await generateArticle(systemPrompt, userPrompt, modelOverrides)
    }

    // === AI 失败或 Mock 模式 ===
    if (!content) {
      content = generateMockArticle({
        keyword: keyword || "默认话题",
        domain: domain || "情感",
        style: style || "情感共鸣",
        wordCount: wordCount || 1500,
      })
    }

    // === 每5次生成自动扣1次（2分钟冷却）===
    let autoDeducted = false
    if (/^\d+$/.test(userId)) {
      try {
        // 更新 gen_count
        await pool.execute(
          "UPDATE users SET gen_count = gen_count + 1 WHERE id = ?",
          [parseInt(userId)]
        )

        // 检查是否触发自动扣费
        const [genRows] = await pool.execute(
          "SELECT gen_count, gen_cooldown_until FROM users WHERE id = ?",
          [parseInt(userId)]
        ) as any[]
        const genCount = Number(genRows[0]?.gen_count) || 0
        const cooldownUntil = genRows[0]?.gen_cooldown_until
        const now = new Date()

        if (genCount >= 5 && (!cooldownUntil || new Date(cooldownUntil) <= now)) {
          // 自动扣1次
          await pool.execute(
            "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, 'auto_gen5', 1)",
            [userId]
          )
          // 重置计数 + 设置冷却
          await pool.execute(
            "UPDATE users SET gen_count = 0, gen_cooldown_until = DATE_ADD(NOW(), INTERVAL 2 MINUTE) WHERE id = ?",
            [parseInt(userId)]
          )
          autoDeducted = true
        }
      } catch { /* gen_count 更新失败不影响主流程 */ }
    }

    // 返回更新后的额度
    const updatedCredits = await checkCredits(userId, ip)

    // 记录生成历史
    try {
      await pool.execute(
        "INSERT INTO generate_history (type, user_input, result, domain, user_identifier) VALUES (?, ?, ?, ?, ?)",
        ["article", keyword, content, domain, userId]
      )
    } catch { /* DB 不可用 */ }

    return NextResponse.json({ content, credits: updatedCredits, autoDeducted })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 })
  }
}
