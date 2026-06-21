import { NextRequest, NextResponse } from "next/server"
import { verifyUserToken } from "@/lib/auth-user"
import { checkCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { confirmGenerate } from "@/lib/rate-limit"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // 登录检查
    let authUserId = ""
    const payload = request.headers.get("x-user-payload")
    if (payload) {
      try { const p = JSON.parse(payload); authUserId = String(p.userId) } catch {}
    }
    if (!authUserId) {
      const token = request.cookies.get("user_token")?.value
      if (token) {
        const p = await verifyUserToken(token)
        if (p) authUserId = String(p.userId)
      }
    }
    if (!authUserId) {
      return NextResponse.json({ error: "请先登录后再确认文章" }, { status: 401 })
    }

    const { title, content } = await request.json()
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json({ error: "文章内容不能为空" }, { status: 400 })
    }

    // 积分检查（不扣费 — 快速生成路径在 /api/generate 时已扣）
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const creditsCheck = await checkCredits(userId, ip, "confirm")
    if (!creditsCheck.allowed) {
      const msg = creditsCheck.isLoggedIn
        ? "额度已用完，请购买套餐继续使用"
        : `免费次数已用完（${creditsCheck.freeQuotaUsed}/${creditsCheck.freeQuotaTotal}），请登录后购买套餐`
      return NextResponse.json(
        { error: msg, code: "NO_CREDITS" },
        { status: 402 }
      )
    }

    // 写入历史记录
    const [result] = await pool.execute(
      "INSERT INTO user_history (user_id, type, title, content, word_count) VALUES (?, ?, ?, ?, ?)",
      [
        parseInt(userId),
        "article",
        title || "未命名文章",
        content.trim(),
        content.trim().length,
      ]
    )

    // 标记最近一条未确认的生成历史为 confirmed
    await pool.execute(
      "UPDATE generate_history SET status = 'confirmed' WHERE user_identifier = ? AND status = 'unconfirmed' ORDER BY id DESC LIMIT 1",
      [userId]
    ).catch(() => {})

    // 解除生成冷却
    confirmGenerate(authUserId)

    // 返回更新后的额度
    const updatedCredits = await checkCredits(userId, ip, "confirm")

    return NextResponse.json({
      success: true,
      credits: updatedCredits,
      message: "文章已确认，内容已解锁",
    })
  } catch (error) {
    console.error("Confirm error:", error)
    return NextResponse.json({ error: "确认失败" }, { status: 500 })
  }
}
