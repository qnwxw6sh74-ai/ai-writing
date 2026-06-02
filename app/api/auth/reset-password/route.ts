import { NextRequest, NextResponse } from 'next/server'
import { verifyResetToken, hashPassword, updateUserPassword } from '@/lib/auth-user'

/** POST — 重置密码 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    const payload = await verifyResetToken(token)
    if (!payload) {
      return NextResponse.json({ error: '重置链接已过期或无效，请重新申请' }, { status: 400 })
    }

    const newHash = await hashPassword(password)
    await updateUserPassword(payload.userId, newHash)

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: '重置失败，请稍后重试' }, { status: 500 })
  }
}
