import { NextRequest, NextResponse } from "next/server"
import { generateMockTitles } from "@/lib/mock-ai"
import { generateTitles } from "@/lib/ai-client"
import { checkCredits, deductCredits, resolveUserId } from "@/lib/credits"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { keyword, domain, modelId } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 })
    }

    // === 服务端积分检查 ===
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const creditsCheck = await checkCredits(userId)

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
    let titles: string[] = []

    // === 真实 AI 模式 ===
    if (!mockMode) {
      let systemPrompt = "你是一个公众号爆款标题专家，精通让用户忍不住点击的标题技巧。"
      let userPrompt = `请围绕"${keyword}"这个主题，生成5个极具吸引力的公众号标题。要求：使用数字、悬念、对比等技巧，每个标题不超过30字，适合在朋友圈传播。`

      try {
        const [rows] = await pool.execute(
          "SELECT system_prompt, user_prompt_template FROM prompt_templates WHERE type = 'title' AND is_active = 1 AND (domain = ? OR domain = '通用') ORDER BY sort_order LIMIT 1",
          [domain || "通用"]
        ) as any[]
        if (rows.length > 0) {
          systemPrompt = rows[0].system_prompt || systemPrompt
          userPrompt = (rows[0].user_prompt_template || userPrompt)
            .replace(/{keyword}/g, keyword)
            .replace(/{domain}/g, domain || "通用")
        }
      } catch { /* DB 不可用，用默认 prompt */ }

      titles = await generateTitles(systemPrompt, userPrompt, modelOverrides)
    }

    // === AI 失败或 Mock 模式 ===
    if (!titles || titles.length === 0) {
      titles = generateMockTitles({ keyword: keyword || "默认话题", domain: domain || "通用" })
    }

    // === 生成成功，扣除积分 ===
    const updatedCredits = await deductCredits(userId, "title")

    return NextResponse.json({ titles, credits: updatedCredits })
  } catch (error) {
    console.error("Title generation error:", error)
    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
