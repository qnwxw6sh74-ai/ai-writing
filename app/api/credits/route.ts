import { NextRequest, NextResponse } from "next/server"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"

// GET — 查询剩余额度
export async function GET(request: NextRequest) {
  try {
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    return NextResponse.json(await checkCredits(userId, ip))
  } catch {
    return NextResponse.json({ paymentEnabled: false, remaining: Infinity, total: Infinity, used: 0, purchasedCredits: 0 })
  }
}

// POST — 记录一次使用（生成成功后调用）
export async function POST(request: NextRequest) {
  try {
    const { action = "generate" } = await request.json().catch(() => ({}))
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const result = await deductCredits(userId, ip, action)
    return NextResponse.json({ success: true, ...result })
  } catch {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 500 })
  }
}
