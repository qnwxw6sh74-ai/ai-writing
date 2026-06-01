import { NextRequest, NextResponse } from "next/server"
import { createOrder } from "@/lib/payment"

export async function POST(request: NextRequest) {
  try {
    const { price, type, planId } = await request.json()

    if (!price || !type) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    const result = await createOrder({
      price,
      type: type as 1 | 2,
      param: `plan_${planId || 0}`,
      isHtml: 0,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json({ success: false, message: "创建订单失败" }, { status: 500 })
  }
}
