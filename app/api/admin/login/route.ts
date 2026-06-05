import { NextRequest, NextResponse } from "next/server"
import { verifyAdminLogin, createAdminToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!verifyAdminLogin(username, password)) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    const token = await createAdminToken(username)

    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 })
  }
}
