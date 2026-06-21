import { NextResponse } from "next/server"

/**
 * GET /api/health
 * 健康检查端点 — 供 PM2 和 Nginx 使用
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
