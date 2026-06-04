import { NextRequest, NextResponse } from "next/server"
import { verifyUserToken } from "@/lib/auth-user"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
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

    // 获取邀请码和邀请统计
    const [userRows] = await pool.execute(
      "SELECT invite_code FROM users WHERE id = ?",
      [parseInt(userId)]
    ) as any[]

    let inviteCode = userRows[0]?.invite_code || ""
    if (!inviteCode) {
      // 旧用户没有邀请码，生成一个
      const crypto = await import("crypto")
      inviteCode = crypto.randomBytes(4).toString("hex").slice(0, 6)
      await pool.execute(
        "UPDATE users SET invite_code = ? WHERE id = ?",
        [inviteCode, parseInt(userId)]
      )
    }

    // 统计成功邀请数（对方已邮箱验证）
    const [statsRows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE id IN (SELECT id FROM users WHERE email_verified = 1) AND invite_code IS NOT NULL",
      []
    ) as any[]
    // 简化：统计通过邀请码注册的人数
    const [invitedRows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM credits_recharge WHERE user_identifier IN (SELECT CAST(id AS CHAR) FROM users WHERE invite_code = ?) AND user_identifier != ?",
      [inviteCode, userId]
    ) as any[]

    const invitedCount = Number(invitedRows[0]?.cnt) || 0

    return NextResponse.json({
      inviteCode,
      inviteUrl: `https://w.wyrunwu.com/register?invite=${inviteCode}`,
      invitedCount,
      reward: "双方各得3次额度",
    })
  } catch (error) {
    console.error("Invite stats error:", error)
    return NextResponse.json({ error: "获取邀请信息失败" }, { status: 500 })
  }
}
