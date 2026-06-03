import { NextRequest, NextResponse } from "next/server"
import { analyzeTextLocal, aiAnalyzeOriginality } from "@/lib/originality"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { verifyUserToken, UserPayload } from "@/lib/auth-user"

// ---- 常量 ----

const MIN_TEXT_LENGTH = 50

// ---- 工具 ----

/** 统一认证检查：从 middleware header 或 cookie 提取用户信息 */
async function checkUserAuth(request: NextRequest): Promise<UserPayload | null> {
  // 优先从中间件注入的 header 获取（已验证）
  const userPayload = request.headers.get("x-user-payload")
  if (userPayload) {
    try {
      const payload = JSON.parse(userPayload)
      if (payload.userId && payload.role === 'user') return payload as UserPayload
    } catch { /* 解析失败，继续尝试 cookie */ }
  }

  // 回退：直接读 cookie（中间件未覆盖到此路由时）
  const token = request.cookies.get("user_token")?.value
  if (token) {
    const payload = await verifyUserToken(token)
    if (payload) return payload
  }

  return null
}

/** 输入清理：移除控制字符和 script 标签 */
function sanitizeInput(text: string): string {
  return text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')  // 移除控制字符（保留 \n \t）
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // 移除 script 标签
    .trim()
}

/**
 * POST /api/originality-check
 * 仅登录用户可用，不扣费。
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "请输入检测文本" }, { status: 400 })
    }

    // 1. 输入清理
    const cleanedText = sanitizeInput(text)

    if (cleanedText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json({ error: `请至少输入${MIN_TEXT_LENGTH}字进行检测` }, { status: 400 })
    }

    // 2. 登录检查
    const auth = await checkUserAuth(request)
    if (!auth) {
      return NextResponse.json({ error: "请先登录", code: "LOGIN_REQUIRED" }, { status: 401 })
    }

    // 2. 本地统计分析（始终执行）
    const localResult = analyzeTextLocal(cleanedText)

    // 3. AI 语义分析（可选，失败降级）
    let aiResult = null
    try {
      const resolvedModel = await resolveModel()
      const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined
      aiResult = await aiAnalyzeOriginality(cleanedText, chatCompletion, overrides)
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
