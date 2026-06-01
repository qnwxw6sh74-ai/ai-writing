import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET - 获取所有配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get("group")

    let sql = "SELECT `key`, `value`, `type`, `description`, `group` FROM site_config"
    const params: string[] = []

    if (group) {
      sql += " WHERE `group` = ?"
      params.push(group)
    }

    sql += " ORDER BY `group`, `key`"

    const [rows] = await pool.execute(sql, params)
    return NextResponse.json({ settings: rows })
  } catch (error) {
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 })
  }
}

// PUT - 更新配置
export async function PUT(request: NextRequest) {
  try {
    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ error: "缺少key参数" }, { status: 400 })
    }

    await pool.execute(
      "UPDATE site_config SET `value` = ? WHERE `key` = ?",
      [value, key]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 })
  }
}
