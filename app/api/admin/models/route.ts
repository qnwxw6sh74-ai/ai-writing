import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET - 获取所有 AI 模型（含 api_key）
export async function GET() {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM ai_models ORDER BY sort_order, id"
    )
    return NextResponse.json({ models: rows })
  } catch {
    return NextResponse.json({ models: [] })
  }
}

// POST - 新增模型
export async function POST(request: NextRequest) {
  try {
    const { name, provider, api_key, base_url, model, max_tokens, temperature, is_active, keyword_triggers, sort_order } = await request.json()
    if (!name || !provider) return NextResponse.json({ error: "名称和提供商不能为空" }, { status: 400 })

    const [result] = await pool.execute(
      `INSERT INTO ai_models (name, provider, api_key, base_url, model, max_tokens, temperature, is_active, keyword_triggers, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        provider,
        api_key || "",
        base_url || "",
        model || "gpt-3.5-turbo",
        max_tokens || 4096,
        temperature ?? 0.7,
        is_active ?? 1,
        keyword_triggers || null,
        sort_order || 0,
      ]
    ) as any[]
    return NextResponse.json({ success: true, id: result.insertId })
  } catch (e) {
    console.error("Model POST error:", e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

// PUT - 更新模型
export async function PUT(request: NextRequest) {
  try {
    const { id, name, provider, api_key, base_url, model, max_tokens, temperature, is_active, keyword_triggers, sort_order } = await request.json()
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })

    await pool.execute(
      `UPDATE ai_models SET name=?, provider=?, api_key=?, base_url=?, model=?, max_tokens=?, temperature=?, is_active=?, keyword_triggers=?, sort_order=? WHERE id=?`,
      [
        name,
        provider,
        api_key || "",
        base_url || "",
        model,
        max_tokens || 4096,
        temperature ?? 0.7,
        is_active ?? 1,
        keyword_triggers || null,
        sort_order || 0,
        id,
      ]
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Model PUT error:", e)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

// DELETE - 删除模型
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 })

    // 检查是否最后一个活跃模型
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM ai_models WHERE is_active = 1"
    ) as any[]
    if (Number(countRows[0]?.cnt) <= 1) {
      return NextResponse.json({ error: "至少保留一个活跃模型" }, { status: 400 })
    }

    await pool.execute("DELETE FROM ai_models WHERE id = ?", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Model DELETE error:", e)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
