import { NextRequest, NextResponse } from "next/server"
import { createImageJob } from "@/lib/image-jobs"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { recordFreeUsage } from "@/lib/free-quota"
import { checkGenerateRateLimit } from "@/lib/rate-limit"

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

    // === 积分检查 + 即时扣费（修复异步竞态）===
    const creditsCheck = await checkCredits(userId, ip, "image")

    if (!creditsCheck.allowed) {
      const errorMsg = creditsCheck.isLoggedIn
        ? "额度不足，请购买套餐继续使用"
        : `免费次数已用完（${creditsCheck.freeQuotaUsed}/${creditsCheck.freeQuotaTotal}），请登录后继续使用`
      return NextResponse.json(
        { error: errorMsg, code: "NO_CREDITS", credits: creditsCheck },
        { status: 402 }
      )
    }

    // === 频率限制（每分钟最多 3 次图片生成）===
    const rateLimit = checkGenerateRateLimit(userId || ip, "image")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `生成过于频繁，请等待 ${rateLimit.retryAfter} 秒`, code: "RATE_LIMIT", retryAfter: rateLimit.retryAfter },
        { status: 429 }
      )
    }

    // 即时扣费 + 记录免费配额
    const updatedCredits = await deductCredits(userId, ip, "image")
    recordFreeUsage(ip, "image").catch(() => {})

    // === 构建完整 prompt ===
    const styleSuffix = style && style !== "写实摄影"
      ? `，${style}风格`
      : ""
    const fullPrompt = `${prompt.trim()}，适合公众号配图，高清，无水印${styleSuffix}`
    const sizeParam = size || "800x800"

    console.log(`[image-api] 创建异步任务 user=${userId}, size=${sizeParam}, prompt="${fullPrompt.slice(0, 80)}..."`)

    // === 创建异步任务（积分已扣，失败时退款）===
    const jobId = createImageJob(fullPrompt, sizeParam, userId, ip)

    return NextResponse.json({
      jobId,
      credits: updatedCredits,
      isLoggedIn: creditsCheck.isLoggedIn,
      message: "任务已创建，正在生成...",
    })
  } catch (error) {
    console.error("[image-api] 创建任务失败:", error)
    return NextResponse.json({ error: "创建生成任务失败，请稍后重试" }, { status: 500 })
  }
}
