import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { resolveUserId } from "@/lib/credits"
import { saveStyleProfile } from "@/lib/style-profile"
import { getUserFromRequest } from "@/lib/auth-user"
import pool from "@/lib/db"

/**
 * POST — 9维度分析用户上传的文章，提取写作风格指纹 + 标志性短句
 * Body: { texts: string[] } — 至少3篇文章
 */
export async function POST(request: NextRequest) {
  try {
    // 解析用户身份（需登录）
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }
    const userIdNum = user.userId

    const { texts } = await request.json()
    if (!texts || !Array.isArray(texts) || texts.length < 3) {
      return NextResponse.json({ error: "请至少上传3篇文章" }, { status: 400 })
    }

    // 每篇截取前2000字，避免 token 爆炸
    const samples = texts.map((t: string) => String(t).slice(0, 2000))

    // 从 prompt_templates 加载分析 prompt
    let systemPrompt = ""
    let userPromptTemplate = ""
    try {
      const [rows] = await pool.execute(
        `SELECT system_prompt, user_prompt_template FROM prompt_templates
         WHERE type = 'style_analysis' AND is_active = 1 ORDER BY sort_order LIMIT 1`
      ) as any[]
      if (rows.length > 0) {
        systemPrompt = rows[0].system_prompt || ""
        userPromptTemplate = rows[0].user_prompt_template || ""
      }
    } catch { /* fallback to hardcoded prompt below */ }

    // 构建用户消息
    const userMessage = userPromptTemplate
      ? userPromptTemplate
          .replace("{{count}}", String(samples.length))
          .replace("{{samples}}", samples.map((s, i) => `=== 文章${i + 1} ===\n${s}\n`).join("\n"))
      : samples.map((s, i) => `=== 文章${i + 1} ===\n${s}\n`).join("\n")

    // AI 调用
    const resolvedModel = await resolveModel()
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const messages = systemPrompt
      ? [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: userMessage }]
      : [{ role: "user" as const, content: `${systemPrompt || "请分析以下文章的写作风格"}\n\n${userMessage}` }]

    const result = await chatCompletion(messages, {
      ...overrides,
      temperature: 0.3,
      maxTokens: 4000, // 9维度+5个meme需要更多token
    })

    if (!result) {
      return NextResponse.json({ error: "风格分析失败，AI 未返回结果，请稍后重试" }, { status: 500 })
    }

    // 提取 JSON（可能包裹在 markdown 代码块中）
    let jsonStr = result
    const match = result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) jsonStr = match[1].trim()

    let parsed: any
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // 尝试从结果中提取 JSON 对象
      const objMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objMatch) {
        try { parsed = JSON.parse(objMatch[0]) } catch { /* fall through */ }
      }
      if (!parsed) {
        console.error("[style-analyze] JSON parse failed, raw:", result.slice(0, 500))
        return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 500 })
      }
    }

    // 提取 profile（9 维度）
    const profile = {
      avgSentenceLength: parsed.avgSentenceLength || "",
      sentencePatterns: parsed.sentencePatterns || "",
      vocabularyPrefs: parsed.vocabularyPrefs || "",
      openingStyle: parsed.openingStyle || "",
      endingStyle: parsed.endingStyle || "",
      punctuationEmojiHabits: parsed.punctuationEmojiHabits || "",
      emotionalTemperature: parsed.emotionalTemperature || "",
      personUsage: parsed.personUsage || "",
      readerRelationship: parsed.readerRelationship || "",
    }

    // 提取签名短语
    const signaturePhrases: { phrase: string; context: string; typicalUsage: string }[] =
      (parsed.signaturePhrases || []).map((m: any, i: number) => ({
        phrase: m.phrase || "",
        context: m.context || "",
        typicalUsage: m.typicalUsage || "",
        sortRank: i,
      }))

    // 源文章预览（前100字 + 标题猜测）
    const sourcePreviews = samples.map(s => {
      const firstLine = s.split("\n")[0]?.slice(0, 50) || ""
      return firstLine || s.slice(0, 50)
    })

    // 保存到新表
    const saved = await saveStyleProfile(
      userIdNum,
      profile,
      signaturePhrases,
      sourcePreviews,
      samples.length,
      result, // AI 原始输出
    )

    if (!saved) {
      return NextResponse.json({ error: "风格档案保存失败，请稍后重试" }, { status: 500 })
    }

    return NextResponse.json({
      profile: saved.profile,
      memes: saved.memes,
      version: saved.version,
      sourceArticleCount: saved.sourceArticleCount,
    })
  } catch (e) {
    console.error("[style-analyze] error:", e)
    return NextResponse.json({ error: "分析失败，请稍后重试" }, { status: 500 })
  }
}
