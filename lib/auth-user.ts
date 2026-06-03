import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import pool from '@/lib/db'

// ---- 常量 ----

const TOKEN_EXPIRY_DAYS = 7
const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60
const RESET_TOKEN_EXPIRY = '1h'
const BCRYPT_ROUNDS = 10

// ---- 类型 ----

export interface User {
  id: number
  email: string
  nickname: string
  email_verified: number
  bio: string | null
  favorite_keywords: string | null
  preferred_style: string | null
  total_generations: number
  total_exports: number
  last_export_format: string | null
  created_at: string
  last_login_at: string | null
}

export interface UserPayload {
  userId: number
  email: string
  role: 'user'
}

// ---- JWT ----

// 与 lib/auth.ts 使用同一个 JWT_SECRET，确保 admin 和 user token 可共存
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET 环境变量未设置！请在生产环境中配置强密钥。')
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'ai-writing-secret-key-change-me'
)

const USER_TOKEN_COOKIE = 'user_token'

// ---- 统一错误处理 ----

function handleError(operation: string, error: unknown): void {
  console.error(`[auth-user] ${operation} 失败:`, error instanceof Error ? error.message : error)
}

export async function createUserToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_DAYS}d`)
    .sign(JWT_SECRET)
}

export async function verifyUserToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.role !== 'user' || !payload.userId) return null
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

/** 从请求 cookie 提取用户信息，未登录返回 null */
export function getUserFromRequest(request: Request): UserPayload | null {
  // 从 middleware 注入的 header 获取（中间件已验证 JWT）
  const header = request.headers.get('x-user-payload')
  if (header) {
    try { return JSON.parse(header) } catch { return null }
  }
  return null
}

// ---- 密码 ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---- 邮箱验证 ----

function getMailTransporter() {
  const host = process.env.SMTP_HOST || ''
  const port = parseInt(process.env.SMTP_PORT || '465')
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''

  if (!host || !user || !pass) {
    console.warn('SMTP 未配置，验证邮件将无法发送')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendVerificationEmail(
  toEmail: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const transporter = getMailTransporter()
  if (!transporter) {
    return { success: false, message: '邮件服务未配置，请联系管理员' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const verifyUrl = `${siteUrl}/api/auth/verify?token=${token}`

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: '验证您的邮箱 — AI爆文生成器',
      html: `
        <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif">
          <h2 style="color:#ef4444">AI 爆文生成器</h2>
          <p>感谢注册！请点击下方按钮验证您的邮箱地址：</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">验证邮箱</a>
          <p style="color:#888;font-size:12px">如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="color:#888;font-size:12px;word-break:break-all">${verifyUrl}</p>
          <p style="color:#888;font-size:12px;margin-top:24px">如非本人操作，请忽略此邮件。</p>
        </div>
      `,
    })
    return { success: true, message: '验证邮件已发送' }
  } catch (error: any) {
    console.error('发送验证邮件失败:', error)
    return { success: false, message: `邮件发送失败: ${error.message}` }
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// ---- 数据库查询 ----

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, nickname, email_verified, verification_token, bio, favorite_keywords, preferred_style, total_generations, total_exports, last_export_format, created_at, last_login_at FROM users WHERE email = ?',
      [email]
    ) as any[]
    return (rows[0] as User) || null
  } catch (error) {
    handleError('getUserByEmail', error)
    return null
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, nickname, email_verified, bio, favorite_keywords, preferred_style, total_generations, total_exports, last_export_format, created_at, last_login_at FROM users WHERE id = ?',
      [id]
    ) as any[]
    return (rows[0] as User) || null
  } catch (error) {
    handleError('getUserById', error)
    return null
  }
}

/** 按需查询用户展示信息（轻量查询，不含敏感字段） */
export async function getUserProfile(id: number): Promise<Pick<User, 'id' | 'nickname' | 'email_verified' | 'bio' | 'favorite_keywords' | 'preferred_style' | 'total_generations' | 'total_exports' | 'last_export_format'> | null> {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nickname, email_verified, bio, favorite_keywords, preferred_style, total_generations, total_exports, last_export_format FROM users WHERE id = ?',
      [id]
    ) as any[]
    return rows[0] || null
  } catch (error) {
    handleError('getUserProfile', error)
    return null
  }
}

export async function updateUserProfile(
  userId: number,
  data: { nickname?: string; bio?: string; favorite_keywords?: string; preferred_style?: string }
): Promise<boolean> {
  try {
    const fields: string[] = []
    const values: any[] = []
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    if (fields.length === 0) return true
    values.push(userId)
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
    return true
  } catch (error) {
    handleError('updateUserProfile', error)
    return false
  }
}

export async function updateUserPassword(userId: number, newHash: string): Promise<boolean> {
  try {
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId])
    return true
  } catch (error) {
    handleError('updateUserPassword', error)
    return false
  }
}

export async function incrementUserStats(
  userId: number,
  stat: 'total_generations' | 'total_exports',
  exportFormat?: string
): Promise<void> {
  try {
    if (stat === 'total_exports' && exportFormat) {
      await pool.execute(
        'UPDATE users SET total_exports = total_exports + 1, last_export_format = ? WHERE id = ?',
        [exportFormat, userId]
      )
    } else {
      await pool.execute(
        `UPDATE users SET ${stat} = ${stat} + 1 WHERE id = ?`,
        [userId]
      )
    }
  } catch (error) {
    handleError('incrementUserStats', error)
  }
}

/** 创建密码重置 token（1小时有效） */
export async function createResetToken(userId: number): Promise<string> {
  return new SignJWT({ userId, purpose: 'password_reset' } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(RESET_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

/** 验证密码重置 token */
export async function verifyResetToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.purpose !== 'password_reset' || !payload.userId) return null
    return { userId: payload.userId as number }
  } catch {
    return null
  }
}

export { USER_TOKEN_COOKIE, TOKEN_EXPIRY_SECONDS }
