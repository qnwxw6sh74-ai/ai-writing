import { NextRequest, NextResponse } from "next/server"
import { generateImage } from "@/lib/image-gen"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"

export const maxDuration = 120 // 允许图片生成最多 120 秒

/**
 * POST /api/image/generate
 * AI 智能配图 — 调用 Agnes 文生图，每张消耗 1 积分
 *
 * Body: { prompt: string, size: string, style: string }
 * size: "900x383" | "800x800" | "600x400"
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

    console.log(`[image-api] 用户=${userId}, IP=${ip}, size=${size}, prompt="${fullPrompt.slice(0, 80)}..."`)

    // === 调用图片生成 ===
    const result = await generateImage({ prompt: fullPrompt, size })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // === 扣 1 积分 ===
    const updatedCredits = await deductCredits(userId, ip, "image_generate")

    return NextResponse.json({
      imageUrl: result.imageUrl,
      credits: updatedCredits,
    })
  } catch (error) {
    console.error("[image-api] 生成失败:", error)
    return NextResponse.json({ error: "图片生成失败，请稍后重试" }, { status: 500 })
  }
}
