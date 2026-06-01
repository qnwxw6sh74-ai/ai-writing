import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "ai-writing-secret-key-change-me"
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 保护管理后台 API 和页面
  if (pathname.startsWith("/api/admin/") && !pathname.startsWith("/api/admin/login")) {
    const token = request.cookies.get("admin_token")?.value
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    try {
      await jwtVerify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 })
    }
  }

  // 保护管理后台页面
  if (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin_token")?.value
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    try {
      await jwtVerify(token, JWT_SECRET)
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin/:path*"],
}
