import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { getPaymentEnabled, getFreeCredits } from "@/lib/config"

/** 根据 IP 获取用户标识 */
function getUserIdentifier(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1"
}

// GET — 查询剩余免费次数
export async function GET(request: NextRequest) {
  try {
    const paymentEnabled = await getPaymentEnabled()
    if (!paymentEnabled) {
      return NextResponse.json({ paymentEnabled: false, remaining: Infinity, total: Infinity, used: 0 })
    }

    const freeCredits = await getFreeCredits()
    const userId = getUserIdentifier(request)

    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, freeCredits - used)

    return NextResponse.json({
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
    })
  } catch {
    return NextResponse.json({ paymentEnabled: false, remaining: Infinity, total: Infinity, used: 0 })
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

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, freeCredits - used)

    return NextResponse.json({ success: true, total: freeCredits, used, remaining })
  } catch {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 500 })
  }
}
