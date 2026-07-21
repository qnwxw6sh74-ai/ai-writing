import type { Metadata } from "next"
import { redirect } from "next/navigation"
import pool from "@/lib/db"
import { getPaymentEnabled } from "@/lib/config"
import { verifyUserToken } from "@/lib/auth-user"
import { PricingClient } from "./PricingClient"

export const metadata: Metadata = {
  title: "套餐定价 — 解锁无限AI创作",
  description: "¥2体验套餐快速上手，¥19.9标准套餐适合日常创作，¥39.9专业套餐适合重度自媒体。选择适合你的公众号AI写作套餐。",
  keywords: "AI写作套餐,公众号创作套餐,AI写作定价,AI写作付费,自媒体套餐",
  alternates: { canonical: "https://pdf.wyrunwu.com/pricing" },
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

export default async function PricingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const paymentEnabled = await getPaymentEnabled()
  if (!paymentEnabled) {
    redirect("/")
  }

  // 预检登录状态 — 从 cookie 读取 user_token
  let isLoggedIn = false
  try {
    const cookieStore = await import('next/headers').then(m => m.cookies)
    const cookies = await cookieStore()
    const token = cookies.get('user_token')?.value
    if (token) {
      const payload = await verifyUserToken(token)
      isLoggedIn = !!payload
    }
  } catch { /* ignore */ }

  let plans: PricingPlan[] = []
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, price, credits, COALESCE(description, '') AS description, is_active, sort_order FROM pricing_plans WHERE is_active = 1 AND COALESCE(is_trial, 0) = 0 ORDER BY sort_order"
    ) as any[]
    plans = rows
  } catch { /* DB 不可用 */ }

  return <PricingClient plans={plans} isLoggedIn={isLoggedIn} />
}
