import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createResetToken, getMailTransporter } from '@/lib/auth-user'
import { getSiteUrl } from '@/lib/payment'
import { checkAuthRateLimit } from '@/lib/rate-limit'

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'
}

/** POST — 发送密码重置邮件 */
export async function POST(request: NextRequest) {
  try {
    // 频率限制
    const ip = getClientIP(request)
    const rateCheck = checkAuthRateLimit(ip, 'forgotPassword')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })
    }

    const user = await getUserByEmail(email.trim().toLowerCase())

    // 无论用户是否存在都返回成功（安全考虑，防止邮箱枚举）
    if (!user || !user.email_verified) {
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，您将收到一封密码重置邮件',
      })
    }

    const transporter = getMailTransporter()
    if (!transporter) {
      return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 })
    }

    const token = await createResetToken(user.id)
    const siteUrl = getSiteUrl()
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: '重置密码 — AI爆文生成器',
      html: `
        <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif">
          <h2 style="color:#ef4444">AI 爆文生成器</h2>
          <p>您正在申请重置密码，请点击下方按钮设置新密码：</p>
          <a href="${resetUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">重置密码</a>
          <p style="color:#888;font-size:12px">此链接 <b>1小时内</b> 有效。如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="color:#888;font-size:12px;word-break:break-all">${resetUrl}</p>
          <p style="color:#888;font-size:12px;margin-top:24px">如非本人操作，请忽略此邮件。</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: '重置邮件已发送，请查收（1小时内有效）',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 })
  }
}
