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
    let isTrial = false
    try {
      const [planRows] = await pool.execute(
        "SELECT credits, COALESCE(is_trial, 0) AS is_trial FROM pricing_plans WHERE id = ? AND is_active = 1",
        [planId || 0]
      ) as any[]
      if (planRows.length > 0) {
        creditsToAdd = planRows[0].credits || 0
        isTrial = Number(planRows[0]?.is_trial) === 1
      }
      console.log(`[payment] 套餐查询: planId=${planId}, credits=${creditsToAdd}, isTrial=${isTrial}, userId=${userId}`)

      // 体验套餐仅限首次充值
      if (isTrial) {
        const [rechargeRows] = await pool.execute(
          "SELECT COUNT(*) AS cnt FROM credits_recharge WHERE user_identifier = ?",
          [userId]
        ) as any[]
        const rechargeCnt = Number(rechargeRows[0]?.cnt) || 0
        console.log(`[payment] 体验套餐检查: userId=${userId}, 历史充值次数=${rechargeCnt}`)
        if (rechargeCnt > 0) {
          return NextResponse.json(
            { error: "体验套餐仅限首次充值，请选择其他套餐", code: "TRIAL_USED" },
            { status: 400 }
          )
        }
      }
    } catch (e) { console.error("[payment] DB 查询失败:", e) }

    console.log(`[payment] 开始创建 V免签订单: price=${price}, type=${type}, planId=${planId}, notifyUrl=${getNotifyUrl()}`)

    // 创建 V免签订单
    const result = await createOrder({
      price,
      type: type as 1 | 2,
      param: `plan_${planId || 0}`,
      notifyUrl: getNotifyUrl(),
      returnUrl: `${getSiteUrl()}/pricing?paid=1`,
    })

    console.log(`[payment] V免签订单结果: success=${result.success}, payId=${result.payId}, orderId=${result.orderId}, msg=${result.message}, payPageUrl=${result.payPageUrl || '无'}`)

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

    if (result.success) {
      return NextResponse.json(result)
    }
    return NextResponse.json(result, { status: 502 })
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json({ success: false, message: "创建订单失败" }, { status: 500 })
  }
}
