import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hashPassword, sendVerificationEmail, generateVerificationToken, getUserByEmail } from '@/lib/auth-user'

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()

    // 检查是否已注册
    const existing = await getUserByEmail(emailLower)
    if (existing) {
      if (!existing.email_verified) {
        // 未验证 → 重发验证邮件
        const token = existing.verification_token || generateVerificationToken()
        await pool.execute(
          'UPDATE users SET verification_token = ?, verification_sent_at = NOW() WHERE id = ?',
          [token, existing.id]
        )
        const mailResult = await sendVerificationEmail(emailLower, token)
        return NextResponse.json({
          success: true,
          message: '该邮箱已注册但未验证，已重新发送验证邮件',
          mailSent: mailResult.success,
        })
      }
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 })
    }

    // 创建用户
    const passwordHash = await hashPassword(password)
    const verificationToken = generateVerificationToken()

    await pool.execute(
      `INSERT INTO users (email, password_hash, nickname, verification_token, verification_sent_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [emailLower, passwordHash, nickname || emailLower.split('@')[0], verificationToken]
    )

    // 发送验证邮件
    const mailResult = await sendVerificationEmail(emailLower, verificationToken)

    return NextResponse.json({
      success: true,
      message: mailResult.success
        ? '注册成功！请查看邮箱完成验证'
        : `注册成功，但验证邮件发送失败：${mailResult.message}`,
      mailSent: mailResult.success,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}
