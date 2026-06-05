import { NextRequest, NextResponse } from "next/server"
import { generateMockArticle } from "@/lib/mock-ai"
import { generateArticle } from "@/lib/ai-client"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { checkGenerateCooldown, recordGenerate, checkIPAutoDeduct } from "@/lib/rate-limit"
import { getCached, setCached } from "@/lib/generate-cache"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { keyword, domain, style, wordCount, modelId, dual } = await request.json()
    const isDual = dual === true

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 })
    }
    if (typeof keyword === "string" && keyword.length > 200) {
      return NextResponse.json({ error: "关键词过长，最多200字" }, { status: 400 })
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

    // === 生成冷却检查（90秒，确认后解除）===
    const cooldownKey = /^\d+$/.test(userId) ? userId : ip
    const cooldown = checkGenerateCooldown(cooldownKey)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `请先确认上一篇文章，或等待 ${cooldown.waitSeconds} 秒后再生成`, code: "COOLDOWN", waitSeconds: cooldown.waitSeconds },
        { status: 429 }
      )
    }

    // === 解析 AI 模型 ===
    const resolvedModel = await resolveModel(keyword, modelId)
    const modelOverrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const mockMode = process.env.MOCK_AI === "true"
    let content: string | null = null
    let contentB: string | null = null
    let fromCache = false

    // === 构建 prompt（缓存命中时双版本也需要）===
    let systemPrompt = "你是公众号爆文创作者。"
    let userPrompt = `主题"${keyword}"，${style || "情感共鸣"}风格，${wordCount || 1500}字公众号文章。要求：金句频出、段落分明、结尾引互动。`

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
    try {
      const [styleRows] = await pool.execute(
        "SELECT `value` FROM site_config WHERE `key` = ?",
        [styleKey]
      ) as any[]
      if (styleRows.length > 0 && styleRows[0].value) {
        const styleProfile = JSON.parse(styleRows[0].value)
        const styleDesc = Object.entries(styleProfile)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
        systemPrompt = `${systemPrompt}\n\n【用户风格要求——请严格按以下风格写作】\n${styleDesc}`
      }
    } catch { /* 无风格档案 */ }

    // === 缓存查询 ===
    if (!mockMode) {
      content = getCached(keyword, domain || "", style || "")
      if (content) fromCache = true
    }

    // === 真实 AI 模式 ===
    if (!mockMode && !content) {
      content = await generateArticle(systemPrompt, userPrompt, modelOverrides)
    }

    // === 双版本：B 版（有 userPrompt 无论缓存命中与否）===
    if (isDual && content) {
      const altPrompt = `${userPrompt}\n\n【换一个叙事角度和文风，与上一版形成明显差异】`
      contentB = await generateArticle(systemPrompt, altPrompt, modelOverrides)
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
    if (isDual && !contentB) {
      contentB = generateMockArticle({
        keyword: keyword + "（另一角度）",
        domain: domain || "情感",
        style: style === "情感共鸣" ? "干货实用" : "情感共鸣",
        wordCount: wordCount || 1500,
      })
    }

    // === 写入缓存（真实 AI 结果才缓存，仅缓存 A 版）===
    if (!fromCache && content && !mockMode) {
      setCached(keyword, domain || "", style || "", content)
    }

    // === 登录用户每5次生成自动扣1次（无冷却）===
    let autoDeducted = false
    if (/^\d+$/.test(userId)) {
      try {
        await pool.execute(
          "UPDATE users SET gen_count = gen_count + 1 WHERE id = ?",
          [parseInt(userId)]
        )

        const [genRows] = await pool.execute(
          "SELECT gen_count FROM users WHERE id = ?",
          [parseInt(userId)]
        ) as any[]
        const genCount = Number(genRows[0]?.gen_count) || 0

        if (genCount >= 5) {
          await pool.execute(
            "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, 'auto_gen5', 1)",
            [userId]
          )
          await pool.execute(
            "UPDATE users SET gen_count = 0 WHERE id = ?",
            [parseInt(userId)]
          )
          autoDeducted = true
        }
      } catch { /* gen_count 更新失败不影响主流程 */ }
    }

    // === IP 用户每3次生成自动扣1次（无冷却）===
    if (!/^\d+$/.test(userId)) {
      try {
        if (checkIPAutoDeduct(ip)) {
          await pool.execute(
            "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, 'auto_ip3', 1)",
            [ip]
          )
          autoDeducted = true
        }
      } catch { /* IP 自动扣费失败不影响主流程 */ }
    }

    // 返回更新后的额度
    const updatedCredits = await checkCredits(userId, ip)

    // 记录生成冷却
    recordGenerate(cooldownKey)

    // 记录生成历史
    try {
      await pool.execute(
        "INSERT INTO generate_history (type, user_input, result, domain, user_identifier) VALUES (?, ?, ?, ?, ?)",
        ["article", keyword, content, domain, userId]
      )
    } catch { /* DB 不可用 */ }

    return NextResponse.json({
      content,
      contentB: contentB || undefined,
      credits: updatedCredits,
      autoDeducted,
      dual: isDual,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 })
  }
}
