import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET - 获取留言列表
export async function GET() {
  try {
    const [rows] = await pool.execute(
      "SELECT id, nickname, content, created_at FROM guestbook WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 50"
    )
    return NextResponse.json({ messages: rows })
  } catch (error) {
    console.error("Guestbook GET error:", error)
    // 数据库不可用时返回模拟数据
    return NextResponse.json({
      messages: [
        { id: 1, nickname: "系统提示", content: "留言板正在初始化，请先配置数据库连接（执行 sql/init.sql）", created_at: new Date().toISOString() },
      ],
    })
  }
}

// POST - 提交留言
export async function POST(request: NextRequest) {
  try {
    const { nickname, content } = await request.json()

    if (!nickname || !content) {
      return NextResponse.json({ error: "昵称和内容不能为空" }, { status: 400 })
    }

    if (nickname.length > 50 || content.length > 500) {
      return NextResponse.json({ error: "内容超出长度限制" }, { status: 400 })
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    await pool.execute(
      "INSERT INTO guestbook (nickname, content, ip) VALUES (?, ?, ?)",
      [nickname, content, ip]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Guestbook POST error:", error)
    return NextResponse.json({ error: "留言失败，请稍后重试" }, { status: 500 })
  }
}
