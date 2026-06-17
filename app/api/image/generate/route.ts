import { NextRequest, NextResponse } from "next/server"
import { createImageJob } from "@/lib/image-jobs"
import { checkCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"

export const maxDuration = 10 // 仅创建任务，不需要长时间

/**
 * POST /api/image/generate
 * AI 智能配图 — 异步模式：立即返回 jobId，后台生成，前端轮询 /api/image/status
 * 生成成功后才扣积分，失败不扣。
 *
 * Body: { prompt: string, size: string, style: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, size, style } = await request.json()

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "图片描述不能为空" }, { status: 400 })
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "描述过长，最多500字" }, { status: 400 })
    }

    // === 解析用户标识 ===
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

    // === 积分检查（仅检查，不扣费）===
    const creditsCheck = await checkCredits(userId, ip)

    if (!creditsCheck.allowed) {
      const errorMsg = creditsCheck.isLoggedIn
        ? "额度不足，请购买套餐继续使用"
        : "免费次数已用完，请登录后继续使用"
      return NextResponse.json(
        { error: errorMsg, code: "NO_CREDITS", isLoggedIn: creditsCheck.isLoggedIn },
        { status: 402 }
      )
    }

    // === 构建完整 prompt ===
    const styleSuffix = style && style !== "写实摄影"
      ? `，${style}风格`
      : ""
    const fullPrompt = `${prompt.trim()}，适合公众号配图，高清，无水印${styleSuffix}`
    const sizeParam = size || "800x800"

    console.log(`[image-api] 创建异步任务 user=${userId}, size=${sizeParam}, prompt="${fullPrompt.slice(0, 80)}..."`)

    // === 创建异步任务（生成成功后才在回调中扣积分）===
    const jobId = createImageJob(fullPrompt, sizeParam, userId, ip)

    return NextResponse.json({
      jobId,
      credits: {
        remaining: creditsCheck.remaining - 1, // 预估：扣减 1 后的剩余
        used: creditsCheck.used + 1,
        freeRemaining: creditsCheck.freeRemaining > 0 ? creditsCheck.freeRemaining - 1 : 0,
        purchasedRemaining: creditsCheck.freeRemaining > 0 ? creditsCheck.purchasedRemaining : Math.max(0, creditsCheck.purchasedRemaining - 1),
      },
      isLoggedIn: creditsCheck.isLoggedIn,
      message: "任务已创建，正在生成...",
    })
  } catch (error) {
    console.error("[image-api] 创建任务失败:", error)
    return NextResponse.json({ error: "创建生成任务失败，请稍后重试" }, { status: 500 })
  }
}
