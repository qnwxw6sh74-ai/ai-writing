import { NextRequest, NextResponse } from "next/server"
import { createOrder, getNotifyUrl } from "@/lib/payment"
import pool from "@/lib/db"

/** 根据 IP 获取用户标识 */
function getUserIdentifier(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1"
}

export async function POST(request: NextRequest) {
  try {
    const { price, type, planId } = await request.json()

    if (!price || !type) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    const userId = getUserIdentifier(request)

    // 查询套餐信息，获取购买额度
    let creditsToAdd = 0
    try {
      const [planRows] = await pool.execute(
        "SELECT credits FROM pricing_plans WHERE id = ? AND is_active = 1",
        [planId || 0]
      ) as any[]
      if (planRows.length > 0) {
        creditsToAdd = planRows[0].credits || 0
      }
    } catch { /* DB 不可用 */ }

    // 创建 V免签订单
    const result = await createOrder({
      price,
      type: type as 1 | 2,
      param: `plan_${planId || 0}`,
      notifyUrl: getNotifyUrl(),
    })

    // 订单信息写入本地数据库
    if (result.orderId && result.success) {
      try {
        await pool.execute(
          `INSERT INTO payment_orders (pay_id, user_identifier, plan_id, price, credits_to_add, status, pay_type)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [result.orderId, userId, planId || null, price, creditsToAdd, type]
        )
      } catch { /* 入库失败不阻塞支付流程 */ }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json({ success: false, message: "创建订单失败" }, { status: 500 })
  }
}
