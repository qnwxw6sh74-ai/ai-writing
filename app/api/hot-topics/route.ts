import { NextResponse } from "next/server"
import { getHotTopics } from "@/lib/hot-topics"

export async function GET() {
  try {
    const data = await getHotTopics()
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  } catch (error) {
    console.error("[hot-topics] API 错误:", error)
    return NextResponse.json(
      { error: "获取热点失败，请稍后重试" },
      { status: 500 }
    )
  }
}
