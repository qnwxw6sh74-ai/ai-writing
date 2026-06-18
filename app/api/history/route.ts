import { NextRequest, NextResponse } from "next/server"
import { verifyUserToken } from "@/lib/auth-user"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // 登录检查
    let userId = ""
    const payload = request.headers.get("x-user-payload")
    if (payload) {
      try { const p = JSON.parse(payload); userId = String(p.userId) } catch {}
    }
    if (!userId) {
      const token = request.cookies.get("user_token")?.value
      if (token) {
        const p = await verifyUserToken(token)
        if (p) userId = String(p.userId)
      }
    }
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = "WHERE user_id = ?"
    const params: any[] = [parseInt(userId)]
    if (type !== "all") {
      whereClause += " AND type = ?"
      params.push(type)
    }

    const [rows] = await pool.execute(
      `SELECT id, type, title, word_count, content, metadata, created_at
       FROM user_history ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[]

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM user_history ${whereClause}`,
      params
    ) as any[]

    return NextResponse.json({
      items: rows,
      total: Number(countRows[0]?.total) || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("History error:", error)
    return NextResponse.json({ error: "查询失败" }, { status: 500 })
  }
}

// DELETE — 删除一条记录
export async function DELETE(request: NextRequest) {
  try {
    let userId = ""
    const payload = request.headers.get("x-user-payload")
    if (payload) {
      try { const p = JSON.parse(payload); userId = String(p.userId) } catch {}
    }
    if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get("id") || "0")
    if (!id) return NextResponse.json({ error: "缺少记录ID" }, { status: 400 })

    await pool.execute(
      "DELETE FROM user_history WHERE id = ? AND user_id = ?",
      [id, parseInt(userId)]
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
