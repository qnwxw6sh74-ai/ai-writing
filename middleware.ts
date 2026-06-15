import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET 环境变量未设置！请在生产环境中配置强密钥。")
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "ai-writing-secret-key-change-me"
)

/** 需要用户登录的 API 路由 */
const USER_API_ROUTES = ["/api/payment/", "/api/style/"]
/** 需要用户登录的页面路由 */
const USER_PAGE_ROUTES = ["/style-lab", "/pricing", "/profile", "/originality-check"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ========== 强制 HTTPS 跳转 ==========
  const proto = request.headers.get("x-forwarded-proto")
  const host = request.headers.get("host") || ""
  // 仅对生产域名生效，localhost 不跳转
  if (proto === "http" && host.includes("wyrunwu.com")) {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = "https"
    return NextResponse.redirect(httpsUrl, 301)
  }

  // ========== 管理员 API 保护 ==========
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

  // ========== 管理员页面保护 ==========
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

  // ========== 用户 API 保护 ==========
  // 回调路由豁免 — V免签是服务器到服务器调用，无用户 cookie
  const isCallback = pathname === "/api/payment/callback"
  const needsUserApi = USER_API_ROUTES.some(r => pathname.startsWith(r)) && !isCallback
  if (needsUserApi) {
    const token = request.cookies.get("user_token")?.value
    if (!token) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      // 将用户信息注入 header，下游路由直接使用
      const headers = new Headers(request.headers)
      headers.set("x-user-payload", JSON.stringify(payload))
      return NextResponse.next({ request: { headers } })
    } catch {
      return NextResponse.json({ error: "登录已过期，请重新登录" }, { status: 401 })
    }
  }

  // ========== 用户页面保护 ==========
  const needsUserPage = USER_PAGE_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"))
  if (needsUserPage) {
    const token = request.cookies.get("user_token")?.value
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const headers = new Headers(request.headers)
      headers.set("x-user-payload", JSON.stringify(payload))
      return NextResponse.next({ request: { headers } })
    } catch {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ========== 非保护路由也尝试注入用户信息 ==========
  const token = request.cookies.get("user_token")?.value
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const headers = new Headers(request.headers)
      headers.set("x-user-payload", JSON.stringify(payload))
      return NextResponse.next({ request: { headers } })
    } catch { /* token 失效，忽略 */ }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/payment/:path*",
    "/api/style/:path*",
    "/api/auth/:path*",
    "/api/generate",
    "/api/credits",
    "/api/article/confirm",
    "/api/article/rewrite",
    "/api/history",
    "/api/hot-topics",
    "/api/invite/:path*",
    "/api/plans",
    "/admin/:path*",
    "/style-lab",
    "/style-lab/:path*",
    "/pricing",
    "/originality-check",
    "/profile",
    "/profile/:path*",
    "/hot-topics",
    "/hot-topics/:path*",
  ],
}
