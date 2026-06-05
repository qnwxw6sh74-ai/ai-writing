import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  (() => {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET 环境变量未配置，服务拒绝启动。请在 .env.local 中设置强密钥。')
    return secret
  })()
)

export async function createAdminToken(username: string): Promise<string> {
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<boolean> {
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
