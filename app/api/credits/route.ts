import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { getPaymentEnabled, getFreeCredits } from "@/lib/config"
import { resolveUserId } from "@/lib/credits"

/** 获取用户标识：登录用 user_id，未登录用 IP */
function getUserIdentifier(request: NextRequest): string {
  return resolveUserId(
    request.headers.get("x-user-payload"),
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip")
  )
}

// GET — 查询剩余额度（免费 + 付费）
export async function GET(request: NextRequest) {
  try {
    const paymentEnabled = await getPaymentEnabled()
    if (!paymentEnabled) {
      return NextResponse.json({ paymentEnabled: false, remaining: Infinity, total: Infinity, used: 0, purchasedCredits: 0 })
    }

    const freeCredits = await getFreeCredits()
    const userId = getUserIdentifier(request)

    // 已使用次数
    const [usedRows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]
    const used = Number(usedRows[0]?.used) || 0

    // 付费购买的额度（仅登录用户查询，IP用户不适用）
    let purchasedCredits = 0
    if (/^\d+$/.test(userId)) {
      try {
        const [rechargeRows] = await pool.execute(
          "SELECT COALESCE(SUM(credits_added), 0) AS total FROM credits_recharge WHERE user_identifier = ?",
          [userId]
        ) as any[]
        purchasedCredits = Number(rechargeRows[0]?.total) || 0
      } catch { /* credits_recharge 表可能尚未创建 */ }
    }

    const totalCredits = freeCredits + purchasedCredits
    const remaining = Math.max(0, totalCredits - used)

    return NextResponse.json({
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
      purchasedCredits,
    })
  } catch {
    return NextResponse.json({ paymentEnabled: false, remaining: Infinity, total: Infinity, used: 0, purchasedCredits: 0 })
  }
}

// POST — 记录一次使用（生成成功后调用）
export async function POST(request: NextRequest) {
  try {
    const { action = "generate" } = await request.json().catch(() => ({}))
    const userId = getUserIdentifier(request)

    await pool.execute(
      "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, ?, 1)",
      [userId, action]
    )

    // 返回更新后的剩余次数
    const freeCredits = await getFreeCredits()
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = Number(rows[0]?.used) || 0
    const remaining = Math.max(0, freeCredits - used)

    return NextResponse.json({ success: true, total: freeCredits, used, remaining })
  } catch {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 500 })
  }
}
