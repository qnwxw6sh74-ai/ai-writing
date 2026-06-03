import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"
import { verifyUserToken } from "@/lib/auth-user"

// 改写次数追踪：key=userId:articleHash → { count, lastUsed }
const rewriteTracker = new Map<string, { count: number; lastUsed: number }>()
const MAX_REWRITES = 5
const COOLDOWN_MS = 10_000

export async function POST(request: NextRequest) {
  try {
    // 登录检查
    let userId = ""
    const payload = request.headers.get("x-user-payload")
    if (payload) {
      try { const p = JSON.parse(payload); userId = String(p.userId) } catch {}
    }
    if (!userId) {
      const token = request.cookies.get("user_token")?.value
      if (token) {
        const p = await verifyUserToken(token)
        if (p) userId = String(p.userId)
      }
    }
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { text, action, articleHash } = await request.json()
    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return NextResponse.json({ error: "请选中至少5个字" }, { status: 400 })
    }
    if (!["expand", "abbreviate", "regenerate"].includes(action)) {
      return NextResponse.json({ error: "无效的操作" }, { status: 400 })
    }

    // 检查改写次数和冷却
    const trackKey = `${userId}:${articleHash || "default"}`
    let track = rewriteTracker.get(trackKey)
    if (!track) {
      track = { count: 0, lastUsed: 0 }
      rewriteTracker.set(trackKey, track)
    }

    if (track.count >= MAX_REWRITES) {
      return NextResponse.json({ error: `改写次数已用完（${MAX_REWRITES}/篇）` }, { status: 429 })
    }

    const now = Date.now()
    const elapsed = now - track.lastUsed
    if (track.lastUsed > 0 && elapsed < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json({ error: `冷却中，${wait}秒后再试` }, { status: 429 })
    }

    // AI 改写
    const prompts: Record<string, string> = {
      expand: `请将以下文字**扩写**，增加细节、例子或论述，使内容更丰富饱满。保持原意和风格，输出扩写后的版本（仅输出改写后的文字）：\n\n${text.trim()}`,
      abbreviate: `请将以下文字**缩写**，保留核心观点，删减冗余，使表达更精炼。保持原意，输出缩写后的版本（仅输出改写后的文字）：\n\n${text.trim()}`,
      regenerate: `请将以下文字**换一种方式表达**，用不同的句式、词汇重写，但意思不变。输出改写后的版本（仅输出改写后的文字）：\n\n${text.trim()}`,
    }

    const resolvedModel = await resolveModel()
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const result = await chatCompletion(
      [{ role: "user", content: prompts[action] }],
      { ...overrides, temperature: 0.8, maxTokens: 1024 }
    )

    if (!result) {
      return NextResponse.json({ error: "AI 改写失败，请稍后重试" }, { status: 500 })
    }

    // 更新追踪
    track.count += 1
    track.lastUsed = now

    return NextResponse.json({
      result: result.trim(),
      remaining: MAX_REWRITES - track.count,
      total: MAX_REWRITES,
    })
  } catch (error) {
    console.error("Rewrite error:", error)
    return NextResponse.json({ error: "改写失败" }, { status: 500 })
  }
}
