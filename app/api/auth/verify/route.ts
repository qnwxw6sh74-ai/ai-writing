import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url), 302)
    }

    // 查找用户
    const [rows] = await pool.execute(
      'SELECT id, email FROM users WHERE verification_token = ? AND email_verified = 0',
      [token]
    ) as any[]

    if (!rows.length) {
      return NextResponse.redirect(new URL('/login?error=token_expired', request.url), 302)
    }

    // 激活账户
    await pool.execute(
      'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?',
      [rows[0].id]
    )

    // 跳转到登录页，带上成功参数
    return NextResponse.redirect(new URL('/login?verified=1', request.url), 302)
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.redirect(new URL('/login?error=verify_failed', request.url), 302)
  }
}
