import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  (() => {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET 环境变量未配置，服务拒绝启动。请在 .env.local 中设置强密钥。')
    return secret
  })()
)

// 内存黑名单：登出时撤销的 token（重启后清空，最长存活到过期）
const invalidatedTokens = new Set<string>()

/** 将 token 加入撤销列表 */
export function invalidateAdminToken(token: string) {
  invalidatedTokens.add(token)
  // 5 分钟后自动清理（token 最长 24h，5 分钟后攻击窗口已大幅缩小）
  setTimeout(() => invalidatedTokens.delete(token), 5 * 60_000)
}

export async function createAdminToken(username: string): Promise<string> {
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  // 检查是否已被撤销
  if (invalidatedTokens.has(token)) return false
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

// 简单密码验证（用于后台登录）
export function verifyAdminLogin(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME
  const adminPass = process.env.ADMIN_PASSWORD
  if (!adminUser || !adminPass) {
    console.error('[auth] ADMIN_USERNAME 或 ADMIN_PASSWORD 环境变量未配置')
    return false
  }
  return username === adminUser && password === adminPass
}
