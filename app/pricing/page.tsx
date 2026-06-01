import type { Metadata } from "next"
import { redirect } from "next/navigation"
import pool from "@/lib/db"
import { getPaymentEnabled } from "@/lib/config"
import { PricingClient } from "./PricingClient"

export const metadata: Metadata = {
  title: "套餐定价 - AI公众号爆文网",
  description: "选择适合您的套餐，解锁无限AI创作能力",
}

interface PricingPlan {
  id: number
  name: string
  price: number
  credits: number
  description: string
  is_active: number
  sort_order: number
}

export default async function PricingPage() {
  const paymentEnabled = await getPaymentEnabled()
  if (!paymentEnabled) {
    redirect("/")
  }

  let plans: PricingPlan[] = []
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, price, credits, COALESCE(description, '') AS description, is_active, sort_order FROM pricing_plans WHERE is_active = 1 ORDER BY sort_order"
    ) as any[]
    plans = rows
  } catch { /* DB 不可用 */ }

  return <PricingClient plans={plans} />
}
