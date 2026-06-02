import { NextRequest, NextResponse } from "next/server"
import { verifySign } from "@/lib/payment"
import pool from "@/lib/db"

/**
 * GET /api/payment/callback
 * V免签 PHP 异步回调 — 检测到支付后主动通知本站
 *
 * 参数（由 V免签 PHP 拼接）：
 *   payId, param, type, price, sign
 *
 * 校验签名通过后 → 更新订单状态 + 写入充值记录
 * 返回纯文本 "success" / "fail"（V免签协议要求）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payId = searchParams.get("payId") || ""
  const param = searchParams.get("param") || ""
  const type = searchParams.get("type") || "1"
  const price = searchParams.get("price") || "0"
  const sign = searchParams.get("sign") || ""

  if (!payId) {
    return new NextResponse("fail", { status: 400 })
  }

  // 1. 验证签名
  if (!verifySign(payId, param, type, price, sign)) {
    console.warn("V免签回调签名验证失败:", { payId, param, type, price, sign })
    return new NextResponse("fail", { status: 403 })
  }

  try {
    // 2. 查询本地订单
    const [orderRows] = await pool.execute(
      "SELECT id, user_identifier, plan_id, credits_to_add, price, status FROM payment_orders WHERE pay_id = ?",
      [payId]
    ) as any[]

    const order = orderRows[0]

    // 3. 更新订单状态
    if (order) {
      if (order.status === "paid") {
        // 已处理过，幂等返回 success
        return new NextResponse("success")
      }

      await pool.execute(
        "UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE pay_id = ? AND status = 'pending'",
        [payId]
      )
    }

    // 4. 写入充值记录（防重复）
    const creditsToAdd = order?.credits_to_add || 0
    const userId = order?.user_identifier || param || "callback_unknown"
    const orderPrice = order?.price || parseFloat(price) || 0
    const planId = order?.plan_id || null

    if (creditsToAdd > 0) {
      const [existing] = await pool.execute(
        "SELECT id FROM credits_recharge WHERE pay_id = ?",
        [payId]
      ) as any[]
      if (!existing.length) {
        await pool.execute(
          `INSERT INTO credits_recharge (user_identifier, credits_added, price, plan_id, pay_id, source)
           VALUES (?, ?, ?, ?, ?, 'vmq_callback')`,
          [userId, creditsToAdd, orderPrice, planId, payId]
        )
      }
    } else if (!order && creditsToAdd === 0) {
      // 本地无订单记录（可能是直接通过 V免签创建的订单），记录日志但不加额度
      console.warn("V免签回调: 本地无匹配订单", { payId, param, price })
    }

    return new NextResponse("success")
  } catch (error) {
    console.error("V免签回调处理异常:", error)
    return new NextResponse("fail", { status: 500 })
  }
}
