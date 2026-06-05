import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, price, credits, COALESCE(description, '') AS description, COALESCE(is_trial, 0) AS is_trial, is_active, sort_order FROM pricing_plans WHERE is_active = 1 AND COALESCE(is_trial, 0) = 0 ORDER BY sort_order"
    ) as any[]
    return NextResponse.json({ plans: rows })
  } catch {
    return NextResponse.json({ plans: [] })
  }
}
