/**
 * 服务端积分检查与扣除 — 统一入口
 *
 * 所有生成类 API 在入口调用 checkCredits() 判断额度，
 * 生成成功后调用 deductCredits() 写入记录。
 */
import { getPaymentEnabled, getFreeCredits } from "@/lib/config"
import pool from "@/lib/db"

/** 从请求头提取用户标识（IP） */
export function getUserIdentifier(
  xForwardedFor: string | null,
  xRealIp: string | null
): string {
  return xForwardedFor?.split(",")[0]?.trim()
    || xRealIp
    || "127.0.0.1"
}

/**
 * 解析用户标识：登录用户用 user_id，未登录用 IP
 * 优先读取中间件注入的 x-user-payload header
 */
export function resolveUserId(
  xUserPayload: string | null,
  xForwardedFor: string | null,
  xRealIp: string | null
): string {
  if (xUserPayload) {
    try {
      const payload = JSON.parse(xUserPayload)
      if (payload.userId) return String(payload.userId)
    } catch { /* ignore */ }
  }
  return getUserIdentifier(xForwardedFor, xRealIp)
}

export interface CreditsResult {
  /** 是否允许继续生成 */
  allowed: boolean
  /** 付费功能是否启用 */
  paymentEnabled: boolean
  /** 免费次数 */
  total: number
  /** 已使用次数 */
  used: number
  /** 剩余次数（免费+付费-已用） */
  remaining: number
  /** 付费购买的总次数 */
  purchasedCredits: number
}

/**
 * 查询用户已购买的额度总和
 */
async function getPurchasedCredits(userId: string): Promise<number> {
  try {
    const [rows] = await pool.execute(
      "SELECT COALESCE(SUM(credits_added), 0) AS total FROM credits_recharge WHERE user_identifier = ?",
      [userId]
    ) as any[]
    return rows[0]?.total || 0
  } catch {
    return 0
  }
}

/**
 * 检查用户是否还有额度（免费 + 付费）
 * 应在生成前调用
 */
export async function checkCredits(userId: string): Promise<CreditsResult> {
  try {
    const paymentEnabled = await getPaymentEnabled()
    if (!paymentEnabled) {
      return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
    }

    const freeCredits = await getFreeCredits()
    const purchasedCredits = await getPurchasedCredits(userId)
    const totalCredits = freeCredits + purchasedCredits

    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, totalCredits - used)

    return {
      allowed: remaining > 0,
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
      purchasedCredits,
    }
  } catch {
    // DB 不可用时不阻塞生成
    return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
  }
}

/**
 * 记录一次使用（生成成功后调用）
 */
export async function deductCredits(
  userId: string,
  action: string = "generate"
): Promise<CreditsResult> {
  try {
    await pool.execute(
      "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, ?, 1)",
      [userId, action]
    )

    // 返回更新后的状态
    const freeCredits = await getFreeCredits()
    const purchasedCredits = await getPurchasedCredits(userId)
    const totalCredits = freeCredits + purchasedCredits

    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, totalCredits - used)

    return {
      allowed: remaining > 0,
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
      purchasedCredits,
    }
  } catch {
    return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
  }
}
