import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import pool from '@/lib/db'
import { hashPassword, sendVerificationEmail, generateVerificationToken, getUserByEmail } from '@/lib/auth-user'
import { checkAuthRateLimit } from '@/lib/rate-limit'

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'
}

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').slice(0, 6) // 6位随机码
}

export async function POST(request: NextRequest) {
  try {
    // 频率限制
    const ip = getClientIP(request)
    const rateCheck = checkAuthRateLimit(ip, 'register')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { email, password, nickname, inviteCode } = await request.json()

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

    // 处理邀请码 — 提前解析，避免二次查询
    let inviterId: number | null = null
    if (inviteCode && typeof inviteCode === 'string' && inviteCode.trim()) {
      try {
        const [rows] = await pool.execute(
          'SELECT id FROM users WHERE invite_code = ?',
          [inviteCode.trim()]
        ) as any[]
        if (rows.length > 0) inviterId = rows[0].id
      } catch { /* 邀请查询失败不影响注册 */ }
    }

    // 创建用户
    const passwordHash = await hashPassword(password)
    const verificationToken = generateVerificationToken()
    const code = generateInviteCode()

    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, nickname, email_verified, verification_token, verification_sent_at, invite_code)
       VALUES (?, ?, ?, 0, ?, NOW(), ?)`,
      [emailLower, passwordHash, nickname || emailLower.split('@')[0], verificationToken, code]
    ) as any[]
    const newUserId = result.insertId

    // 发放邀请奖励（双方各 +3 充值额度）
    if (inviterId) {
      try {
        await pool.execute(
          "INSERT INTO credits_recharge (user_identifier, credits_added) VALUES (?, 3)",
          [String(inviterId)]
        )
        await pool.execute(
          "INSERT INTO credits_recharge (user_identifier, credits_added) VALUES (?, 3)",
          [String(newUserId)]
        )
      } catch { /* 奖励发放失败不影响注册 */ }
    }

    // 发送验证邮件
    const mailResult = await sendVerificationEmail(emailLower, verificationToken)

    return NextResponse.json({
      success: true,
      message: mailResult.success
        ? (inviterId ? '注册成功！你和邀请者各获得3次额度。请查看邮箱完成验证' : '注册成功！请查看邮箱完成验证')
        : `注册成功，但验证邮件发送失败：${mailResult.message}`,
      mailSent: mailResult.success,
      inviteCode: code,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}
