import { NextRequest, NextResponse } from "next/server"
import { createOrder, getNotifyUrl, getSiteUrl } from "@/lib/payment"
import { resolveUserId } from "@/lib/credits"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { price, type, planId } = await request.json()

    if (!price || !type) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    // 优先使用登录用户 ID，未登录回退 IP
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )

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
      returnUrl: `${getSiteUrl()}/pricing?paid=1`,
    })

    // 订单写入本地：pay_id 存商户订单号（与 V免签回调的 payId 一致）
    // 前端轮询用 payId（DB 查询），V免签查单用 orderId（云端订单号）
    const merchantPayId = result.payId
    if (merchantPayId && result.success) {
      try {
        await pool.execute(
          `INSERT INTO payment_orders (pay_id, user_identifier, plan_id, price, credits_to_add, status, pay_type)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [merchantPayId, userId, planId || null, price, creditsToAdd, type]
        )
      } catch { /* 入库失败不阻塞支付流程 */ }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json({ success: false, message: "创建订单失败" }, { status: 500 })
  }
}
