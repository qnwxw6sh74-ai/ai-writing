import { NextRequest, NextResponse } from "next/server"
import { checkOrder } from "@/lib/payment"
import pool from "@/lib/db"

/**
 * GET /api/payment/check?payId=xxx
 * 前端轮询此接口，支付成功时自动充值
 * payId 参数对应 V免签的云端 orderId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("payId")
    // 兼容旧参数名
    const payId = orderId || ""

    if (!payId) {
      return NextResponse.json({ error: "缺少订单号" }, { status: 400 })
    }

    // 先查本地订单状态
    let localOrder: any = null
    try {
      const [rows] = await pool.execute(
        "SELECT id, pay_id, user_identifier, plan_id, credits_to_add, price, status FROM payment_orders WHERE pay_id = ?",
        [payId]
      ) as any[]
      localOrder = rows[0] || null
    } catch { /* DB 不可用 */ }

    // 本地已标记为 paid
    if (localOrder?.status === "paid") {
      return NextResponse.json({
        success: true,
        paid: true,
        creditsAdded: localOrder.credits_to_add,
        message: "支付成功，额度已到账",
      })
    }

    // 查 V免签远程状态
    const result = await checkOrder(payId)

    // 支付成功 → 自动充值
    if (result.paid) {
      // 1. 更新订单状态
      if (localOrder) {
        try {
          await pool.execute(
            "UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE pay_id = ? AND status = 'pending'",
            [payId]
          )
        } catch { /* ignore */ }
      }

      // 2. 写入充值记录（防重复）
      const userId = localOrder?.user_identifier || "unknown"
      const creditsToAdd = localOrder?.credits_to_add || 0
      const price = localOrder?.price || 0
      const planId = localOrder?.plan_id || null

      if (creditsToAdd > 0) {
        try {
          const [existing] = await pool.execute(
            "SELECT id FROM credits_recharge WHERE pay_id = ?",
            [payId]
          ) as any[]
          if (!existing.length) {
            await pool.execute(
              `INSERT INTO credits_recharge (user_identifier, credits_added, price, plan_id, pay_id, source)
               VALUES (?, ?, ?, ?, ?, 'vmq')`,
              [userId, creditsToAdd, price, planId, payId]
            )
          }
        } catch { /* ignore */ }
      }

      return NextResponse.json({
        success: true,
        paid: true,
        creditsAdded: creditsToAdd,
        message: "支付成功，额度已到账",
      })
    }

    // 未支付
    return NextResponse.json({
      success: true,
      paid: false,
      message: result.msg || "等待支付",
    })
  } catch (error) {
    console.error("Payment check error:", error)
    return NextResponse.json({ success: false, paid: false, message: "查询失败" }, { status: 500 })
  }
}
