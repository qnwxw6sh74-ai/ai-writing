import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { resolveUserId } from "@/lib/credits"

/**
 * GET — 获取当前用户的风格档案
 */
export async function GET(request: NextRequest) {
  try {
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const [rows] = await pool.execute(
      "SELECT `value` FROM site_config WHERE `key` = ?",
      [`user_style_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`]
    ) as any[]

    if (rows.length > 0 && rows[0].value) {
      try {
        return NextResponse.json({ profile: JSON.parse(rows[0].value), hasStyle: true })
      } catch { /* fall through */ }
    }
    return NextResponse.json({ profile: null, hasStyle: false })
  } catch {
    return NextResponse.json({ profile: null, hasStyle: false })
  }
}

/**
 * POST — 保存用户的风格档案
 */
export async function POST(request: NextRequest) {
  try {
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const { profile } = await request.json()
    if (!profile) return NextResponse.json({ error: "缺少风格数据" }, { status: 400 })

    const key = `user_style_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
    const value = JSON.stringify(profile)

    // UPSERT
    await pool.execute(
      "INSERT INTO site_config (`key`, `value`, `type`, `description`, `group`) VALUES (?, ?, 'json', ?, 'style') ON DUPLICATE KEY UPDATE `value` = ?",
      [key, value, `用户风格档案 (${userId.slice(0, 12)})`, value]
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Style save error:", e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

/**
 * DELETE — 清除用户的风格档案
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const key = `user_style_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
    await pool.execute("DELETE FROM site_config WHERE `key` = ?", [key])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
