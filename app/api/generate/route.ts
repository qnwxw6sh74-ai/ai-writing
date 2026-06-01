import { NextRequest, NextResponse } from "next/server"
import { generateMockArticle } from "@/lib/mock-ai"
import { generateArticle } from "@/lib/ai-client"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { keyword, domain, style, wordCount } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "关键词不能为空" }, { status: 400 })
    }

    const mockMode = process.env.MOCK_AI === "true"
    let content: string | null = null

    // === 真实 AI 模式 ===
    if (!mockMode) {
      // 1. 从数据库读取 Prompt 模板
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

      content = await generateArticle(systemPrompt, userPrompt)
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

    // 记录生成历史
    try {
      await pool.execute(
        "INSERT INTO generate_history (type, user_input, result, domain, user_identifier) VALUES (?, ?, ?, ?, ?)",
        ["article", keyword, content, domain, request.headers.get("x-forwarded-for") || "unknown"]
      )
    } catch { /* DB 不可用 */ }

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 })
  }
}
