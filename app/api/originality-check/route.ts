import { NextRequest, NextResponse } from "next/server"
import { resolveUserId, checkCredits, deductCredits } from "@/lib/credits"
import { analyzeTextLocal, aiAnalyzeOriginality } from "@/lib/originality"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"

/**
 * POST /api/originality-check
 * 仅注册+付费用户可用。每次检测扣 1 次额度。
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json({ error: "请至少输入50字进行检测" }, { status: 400 })
    }

    // 1. 检查登录态
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

    // 如果是 IP（未登录用户），拒绝
    const userPayload = request.headers.get("x-user-payload")
    if (!userPayload) {
      // 尝试从 cookie 直接读
      const { verifyUserToken } = await import("@/lib/auth-user")
      const token = request.cookies.get("user_token")?.value
      if (token) {
        const payload = await verifyUserToken(token)
        if (payload) {
          // 验证通过，允许使用
        } else {
          return NextResponse.json({ error: "请先登录", code: "LOGIN_REQUIRED" }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: "请先登录", code: "LOGIN_REQUIRED" }, { status: 401 })
      }
    }

    // 2. 检查额度
    const creditsCheck = await checkCredits(userId)
    if (!creditsCheck.allowed || creditsCheck.remaining <= 0) {
      return NextResponse.json({ error: "额度不足，请先购买套餐", code: "NO_CREDITS" }, { status: 402 })
    }

    // 3. 本地统计分析（始终执行）
    const localResult = analyzeTextLocal(text.trim())

    // 4. AI 语义分析（可选，失败降级）
    let aiResult = null
    try {
      const resolvedModel = await resolveModel()
      const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined
      aiResult = await aiAnalyzeOriginality(text.trim(), chatCompletion, overrides)
    } catch {
      // AI 不可用，降级为纯本地分析
      console.warn("Originality check: AI analysis failed, falling back to local only")
    }

    // 5. 扣除额度
    const updatedCredits = await deductCredits(userId, "originality_check")

    // 6. 合并结果
    const finalScore = aiResult
      ? Math.round(localResult.score * 0.6 + aiResult.aiScore * 0.4)
      : localResult.score

    const suggestions = [
      ...localResult.suggestionHints,
      ...(aiResult?.suggestions || []),
    ].slice(0, 6) // 最多 6 条建议

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
      credits: updatedCredits,
    })
  } catch (error) {
    console.error("Originality check error:", error)
    return NextResponse.json({ error: "检测失败，请稍后重试" }, { status: 500 })
  }
}
