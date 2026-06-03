import { NextRequest, NextResponse } from "next/server"
import { verifyUserToken } from "@/lib/auth-user"
import { checkCredits, deductCredits, getUserIdentifier } from "@/lib/credits"
import pool from "@/lib/db"

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
      return NextResponse.json({ error: "请先登录后再确认文章" }, { status: 401 })
    }

    const { title, content, wordCount } = await request.json()
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json({ error: "文章内容不能为空" }, { status: 400 })
    }

    // 扣费
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const credits = await checkCredits(userId, ip)
    if (!credits.allowed) {
      return NextResponse.json({ error: "额度不足" }, { status: 402 })
    }
    const updated = await deductCredits(userId, ip, "confirm")

    // 写入历史记录
    await pool.execute(
      "INSERT INTO user_history (user_id, type, title, content, word_count) VALUES (?, ?, ?, ?, ?)",
      [
        parseInt(userId),
        "article",
        title || "未命名文章",
        content.trim(),
        wordCount || content.trim().length,
      ]
    )

    return NextResponse.json({
      success: true,
      credits: updated,
      message: "文章已确认，内容已解锁",
    })
  } catch (error) {
    console.error("Confirm error:", error)
    return NextResponse.json({ error: "确认失败" }, { status: 500 })
  }
}
