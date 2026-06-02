import { NextRequest, NextResponse } from "next/server"
import { checkOrder } from "@/lib/payment"
import pool from "@/lib/db"

/**
 * GET /api/payment/check?payId=xxx
 * 查询支付状态，如果已支付则自动充值
 * 前端轮询此接口，支付成功后额度自动到账
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payId = searchParams.get("payId")

    if (!payId) {
      return NextResponse.json({ error: "缺少订单号" }, { status: 400 })
    }

    // 先查本地订单状态
    let localOrder: any = null
    try {
      const [rows] = await pool.execute(
        `SELECT id, pay_id, user_identifier, plan_id, credits_to_add, price, status, pay_type
         FROM payment_orders WHERE pay_id = ?`,
        [payId]
      ) as any[]
      localOrder = rows[0] || null
    } catch { /* DB 不可用 */ }

    // 本地已标记为 paid，直接返回
    if (localOrder?.status === "paid") {
      return NextResponse.json({
        success: true,
        paid: true,
        state: 0,
        creditsAdded: localOrder.credits_to_add,
        message: "支付成功，额度已到账",
      })
    }

    // 查 V免签远程状态
    const result = await checkOrder(payId)

    // 支付成功 → 自动充值
    if (result.success && result.state === 0) {
      // 1. 更新订单状态
      if (localOrder) {
        try {
          await pool.execute(
            "UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE pay_id = ? AND status = 'pending'",
            [payId]
          )
        } catch { /* ignore */ }
      }

      // 2. 写入充值记录（加额度）
      const userId = localOrder?.user_identifier || "unknown"
      const creditsToAdd = localOrder?.credits_to_add || 0
      const price = localOrder?.price || result.price || 0
      const planId = localOrder?.plan_id || null

      if (creditsToAdd > 0) {
        try {
          // 防止重复充值：同一 payId 只充一次
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
        state: 0,
        creditsAdded: creditsToAdd,
        message: "支付成功，额度已到账",
      })
    }

    // 未支付或已关闭
    return NextResponse.json({
      success: result.success,
      paid: false,
      state: result.state,
      message: result.state === 1 ? "订单已关闭" : "等待支付",
    })
  } catch (error) {
    console.error("Payment check error:", error)
    return NextResponse.json({ success: false, paid: false, state: -1 }, { status: 500 })
  }
}
