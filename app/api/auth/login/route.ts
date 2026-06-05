import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyPassword, createUserToken, getUserByEmail, TOKEN_EXPIRY_SECONDS, USER_TOKEN_COOKIE } from '@/lib/auth-user'
import { checkAuthRateLimit } from '@/lib/rate-limit'

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    // 频率限制
    const ip = getClientIP(request)
    const rateCheck = checkAuthRateLimit(ip, 'login')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()
    const user = await getUserByEmail(emailLower)

    if (!user) {
      return NextResponse.json({ error: '邮箱未注册' }, { status: 401 })
    }

    if (!user.email_verified) {
      return NextResponse.json({ error: '邮箱未验证，请先查收验证邮件', code: 'UNVERIFIED' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 })
    }

    // 更新最近登录
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

    // 生成 token
    const token = await createUserToken({
      userId: user.id,
      email: user.email,
      role: 'user',
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    })

    response.cookies.set(USER_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_SECONDS,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
