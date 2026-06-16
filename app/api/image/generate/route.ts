import { NextRequest, NextResponse } from "next/server"
import { createImageJob } from "@/lib/image-jobs"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"

export const maxDuration = 10 // 仅创建任务，不需要长时间

/**
 * POST /api/image/generate
 * AI 智能配图 — 异步模式：立即返回 jobId，后台生成，前端轮询 /api/image/status
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

    // === 积分检查 ===
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

    // === 构建完整 prompt ===
    const styleSuffix = style && style !== "写实摄影"
      ? `，${style}风格`
      : ""
    const fullPrompt = `${prompt.trim()}，适合公众号配图，高清，无水印${styleSuffix}`

    console.log(`[image-api] 异步创建任务 user=${userId}, size=${size}, prompt="${fullPrompt.slice(0, 80)}..."`)

    // === 扣 1 积分（先扣再生成，生成失败不退）===
    const updatedCredits = await deductCredits(userId, ip, "image_generate")

    // === 创建异步任务 ===
    const jobId = createImageJob(fullPrompt, size)

    return NextResponse.json({
      jobId,
      credits: updatedCredits,
      message: "任务已创建，正在生成...",
    })
  } catch (error) {
    console.error("[image-api] 创建任务失败:", error)
    return NextResponse.json({ error: "创建生成任务失败，请稍后重试" }, { status: 500 })
  }
}
