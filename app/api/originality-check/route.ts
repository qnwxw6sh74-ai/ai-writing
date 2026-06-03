import { NextRequest, NextResponse } from "next/server"
import { resolveUserId } from "@/lib/credits"
import { analyzeTextLocal, aiAnalyzeOriginality } from "@/lib/originality"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { verifyUserToken } from "@/lib/auth-user"

/**
 * POST /api/originality-check
 * 仅登录用户可用，不扣费。
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json({ error: "请至少输入50字进行检测" }, { status: 400 })
    }

    // 1. 检查登录态
    let isLoggedIn = false
    const userPayload = request.headers.get("x-user-payload")
    if (userPayload) {
      try { const p = JSON.parse(userPayload); if (p.userId) isLoggedIn = true } catch {}
    }
    if (!isLoggedIn) {
      const token = request.cookies.get("user_token")?.value
      if (token) {
        const payload = await verifyUserToken(token)
        if (payload) isLoggedIn = true
      }
    }
    if (!isLoggedIn) {
      return NextResponse.json({ error: "请先登录", code: "LOGIN_REQUIRED" }, { status: 401 })
    }

    // 2. 本地统计分析（始终执行）
    const localResult = analyzeTextLocal(text.trim())

    // 3. AI 语义分析（可选，失败降级）
    let aiResult = null
    try {
      const resolvedModel = await resolveModel()
      const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined
      aiResult = await aiAnalyzeOriginality(text.trim(), chatCompletion, overrides)
    } catch {
      console.warn("Originality check: AI analysis failed, falling back to local only")
    }

    // 4. 合并结果
    const finalScore = aiResult
      ? Math.round(localResult.score * 0.6 + aiResult.aiScore * 0.4)
      : localResult.score

    const suggestions = [
      ...localResult.suggestionHints,
      ...(aiResult?.suggestions || []),
    ].slice(0, 6)

    return NextResponse.json({
      score: finalScore,
      wordCount: localResult.wordCount,
      details: {
        uniqueWordRatio: localResult.uniqueWordRatio,
        sentenceVariety: localResult.sentenceVariety,
        repeatedPhrases: localResult.repeatedPhrases,
        readabilityScore: localResult.readabilityScore,
      },
      suggestions,
      analysis: aiResult?.analysis || undefined,
      similarPatterns: aiResult?.similarPatterns || undefined,
      method: aiResult ? ("local+ai" as const) : ("local" as const),
    })
  } catch (error) {
    console.error("Originality check error:", error)
    return NextResponse.json({ error: "检测失败，请稍后重试" }, { status: 500 })
  }
}
