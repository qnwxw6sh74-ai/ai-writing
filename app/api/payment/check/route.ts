import { NextRequest, NextResponse } from "next/server"
import { checkOrder } from "@/lib/payment"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "缺少订单号" }, { status: 400 })
    }

    const result = await checkOrder(orderId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Payment check error:", error)
    return NextResponse.json({ success: false, state: -1 }, { status: 500 })
  }
}
