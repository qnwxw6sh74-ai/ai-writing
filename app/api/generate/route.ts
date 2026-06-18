import { NextRequest, NextResponse } from "next/server"
import { generateMockArticle } from "@/lib/mock-ai"
import { generateArticle } from "@/lib/ai-client"
import { checkCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { recordFreeUsage } from "@/lib/free-quota"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { checkGenerateCooldown, recordGenerate } from "@/lib/rate-limit"
import { getCached, setCached } from "@/lib/generate-cache"
import { augmentSystemPrompt } from "@/lib/style-prompt-builder"
import { recordMemeUsage } from "@/lib/style-meme"
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
    const creditsCheck = await checkCredits(userId, ip, "generate")

    if (!creditsCheck.allowed) {
      const msg = creditsCheck.isLoggedIn
        ? "额度已用完，请购买套餐继续使用"
        : `免费次数已用完（${creditsCheck.freeQuotaUsed}/${creditsCheck.freeQuotaTotal}），请登录后购买套餐`
      return NextResponse.json(
        { error: msg, code: "NO_CREDITS", credits: creditsCheck },
        { status: 402 }
      )
    }

    // 立即记录免费配额（在生成前，缩小竞态窗口）
    recordFreeUsage(ip, "generate").catch(() => {})

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

    // === 缓存查询（在风格/禁语加载之前，避免浪费 DB 查询）===
    if (!mockMode) {
      content = getCached(keyword, domain || "", style || "")
      if (content) fromCache = true
    }

    // === 加载用户风格档案 + 禁语 + 模因（仅缓存未命中时）===
    let usedMemeIds: number[] = []
    if (!fromCache && !mockMode) {
      const uid = /^\d+$/.test(userId) ? parseInt(userId) : 0
      const augmented = await augmentSystemPrompt(systemPrompt, uid, 2)
      systemPrompt = augmented.systemPrompt
      usedMemeIds = augmented.usedMemeIds
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

    // === 记录 meme 使用 ===
    if (usedMemeIds.length > 0) {
      recordMemeUsage(usedMemeIds).catch(() => {})
    }

    // 返回更新后的额度（免费配额已在入口处记录）
    const updatedCredits = await checkCredits(userId, ip, "generate")

    // 记录生成冷却
    recordGenerate(cooldownKey)

    // 记录生成历史
    try {
      await pool.execute(
        "INSERT INTO generate_history (type, user_input, result, domain, user_identifier, status) VALUES (?, ?, ?, ?, ?, ?)",
        ["article", keyword, content, domain, userId, "unconfirmed"]
      )
    } catch { /* DB 不可用 */ }

    return NextResponse.json({
      content,
      contentB: contentB || undefined,
      credits: updatedCredits,
      dual: isDual,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 })
  }
}
