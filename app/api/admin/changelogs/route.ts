import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET - 获取所有更新日志
export async function GET() {
  try {
    const [rows] = await pool.execute(
      "SELECT id, version, changes, published_at FROM changelogs ORDER BY published_at DESC"
    )
    return NextResponse.json({ changelogs: rows })
  } catch {
    return NextResponse.json({ changelogs: [] })
  }
}

// POST - 新增更新日志
export async function POST(request: NextRequest) {
  try {
    const { version, changes, published_at } = await request.json()
    if (!version || !changes) {
      return NextResponse.json({ error: "版本号和内容不能为空" }, { status: 400 })
    }
    const [result] = await pool.execute(
      "INSERT INTO changelogs (version, changes, published_at) VALUES (?, ?, ?)",
      [version, JSON.stringify(changes), published_at || new Date().toISOString().split("T")[0]]
    ) as any[]
    return NextResponse.json({ success: true, id: result.insertId })
  } catch (error) {
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

// PUT - 更新日志
export async function PUT(request: NextRequest) {
  try {
    const { id, version, changes, published_at } = await request.json()
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })
    await pool.execute(
      "UPDATE changelogs SET version = ?, changes = ?, published_at = ? WHERE id = ?",
      [version, JSON.stringify(changes), published_at, id]
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

// DELETE - 删除日志
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })
    await pool.execute("DELETE FROM changelogs WHERE id = ?", [id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
