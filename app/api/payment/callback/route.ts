import { NextRequest, NextResponse } from "next/server"
import { verifyCallbackSign } from "@/lib/payment"
import pool from "@/lib/db"

/**
 * GET /api/payment/callback
 * V免签 PHP 异步回调 — 检测到支付后主动通知本站
 *
 * 回调参数：payId, param, type, price, reallyPrice, sign
 * 签名公式：md5(payId + param + type + price + reallyPrice + 通讯密钥)
 *
 * 返回纯文本 "success" / "fail"（V免签协议要求）
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const params: Record<string, string> = {}
  url.searchParams.forEach((v, k) => { params[k] = v })

  // 仅允许本地请求（V免签 PHP 与本站同机部署）
  const xff = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIP = xff?.split(',')[0]?.trim() || realIp || '127.0.0.1'
  console.log(`[payment] 回调收到: IP=${clientIP}, xff=${xff}, realIp=${realIp}, params=${JSON.stringify(params)}`)

  // 允许所有 localhost 变体：IPv4, IPv6, IPv4-mapped IPv6
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === 'localhost'
    || clientIP?.includes('127.0.0.1')  // 匹配 ::ffff:127.0.0.1 等 IPv4-mapped 格式
  if (!isLocalhost) {
    console.warn(`[payment] 非本地回调 IP 被拒: ${clientIP}`)
    return new NextResponse("fail", { status: 403 })
  }

  const { searchParams } = url
  const payId = searchParams.get("payId") || ""
  const param = searchParams.get("param") || ""
  const type = searchParams.get("type") || "1"
  const price = searchParams.get("price") || "0"
  const reallyPrice = searchParams.get("reallyPrice") || price
  const sign = searchParams.get("sign") || ""

  if (!payId) {
    return new NextResponse("fail", { status: 400 })
  }

  // 1. 验证签名（回调签名含 reallyPrice）
  if (!verifyCallbackSign(payId, param, type, price, reallyPrice, sign)) {
    console.warn(`[payment] 回调签名验证失败: payId=${payId}, param=${param}, type=${type}, price=${price}, reallyPrice=${reallyPrice}, sign=${sign}`)
    return new NextResponse("fail", { status: 403 })
  }

  try {
    // 2. 查询本地订单（用 payId 匹配 V免签的云端 orderId）
    const [orderRows] = await pool.execute(
      "SELECT id, user_identifier, plan_id, credits_to_add, price, status FROM payment_orders WHERE pay_id = ?",
      [payId]
    ) as any[]

    const order = orderRows[0]

    if (order) {
      if (order.status === "paid") {
        return new NextResponse("success") // 幂等
      }

      await pool.execute(
        "UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE pay_id = ? AND status = 'pending'",
        [payId]
      )
    }

    // 3. 写入充值记录（防重复）
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
        console.log(`[payment] 回调充值成功: userId=${userId}, credits=${creditsToAdd}, payId=${payId}, planId=${planId}`)
      } else {
        console.log(`[payment] 回调重复充值已跳过: payId=${payId}`)
      }
    } else {
      console.warn(`[payment] 回调 creditsToAdd=0, 跳过充值: payId=${payId}, order=${JSON.stringify(order)}`)
    }

    return new NextResponse("success")
  } catch (error) {
    console.error("V免签回调处理异常:", error)
    return new NextResponse("fail", { status: 500 })
  }
}
