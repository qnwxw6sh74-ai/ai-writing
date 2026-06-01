import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET - 获取所有 Prompt 模板
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    let sql = "SELECT id, name, type, domain, system_prompt, user_prompt_template, is_active, sort_order FROM prompt_templates"
    const params: string[] = []
    if (type) { sql += " WHERE type = ?"; params.push(type) }
    sql += " ORDER BY sort_order, id"
    const [rows] = await pool.execute(sql, params)
    return NextResponse.json({ prompts: rows })
  } catch {
    return NextResponse.json({ prompts: [] })
  }
}

// POST - 新增
export async function POST(request: NextRequest) {
  try {
    const { name, type, domain, system_prompt, user_prompt_template, is_active, sort_order } = await request.json()
    if (!name || !type) return NextResponse.json({ error: "名称和类型不能为空" }, { status: 400 })
    const [result] = await pool.execute(
      "INSERT INTO prompt_templates (name, type, domain, system_prompt, user_prompt_template, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, type, domain || "通用", system_prompt || "", user_prompt_template || "", is_active ?? 1, sort_order || 0]
    ) as any[]
    return NextResponse.json({ success: true, id: result.insertId })
  } catch (e) {
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

// PUT - 更新
export async function PUT(request: NextRequest) {
  try {
    const { id, name, type, domain, system_prompt, user_prompt_template, is_active, sort_order } = await request.json()
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })
    await pool.execute(
      "UPDATE prompt_templates SET name=?, type=?, domain=?, system_prompt=?, user_prompt_template=?, is_active=?, sort_order=? WHERE id=?",
      [name, type, domain, system_prompt, user_prompt_template, is_active ?? 1, sort_order || 0, id]
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

// DELETE - 删除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })
    await pool.execute("DELETE FROM prompt_templates WHERE id = ?", [id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
