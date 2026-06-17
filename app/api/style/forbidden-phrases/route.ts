import { NextRequest, NextResponse } from "next/server"
import { getForbiddenPhrases } from "@/lib/forbidden-phrases"

/**
 * GET — 返回活跃的 AI 禁语列表
 * 供管理后台或调试使用
 */
export async function GET(_request: NextRequest) {
  try {
    const phrases = await getForbiddenPhrases()
    return NextResponse.json({
      phrases,
      count: phrases.length,
      hardCount: phrases.filter(p => p.severity === "hard").length,
      softCount: phrases.filter(p => p.severity === "soft").length,
    })
  } catch (e) {
    console.error("[forbidden-phrases] GET error:", e)
    return NextResponse.json({ error: "获取失败" }, { status: 500 })
  }
}
