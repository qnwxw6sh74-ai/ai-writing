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

export interface CreditsResult {
  /** 是否允许继续生成 */
  allowed: boolean
  /** 付费功能是否启用 */
  paymentEnabled: boolean
  /** 免费总次数 */
  total: number
  /** 已使用次数 */
  used: number
  /** 剩余次数 */
  remaining: number
}

/**
 * 检查用户是否还有免费额度
 * 应在生成前调用
 */
export async function checkCredits(userId: string): Promise<CreditsResult> {
  try {
    const paymentEnabled = await getPaymentEnabled()
    if (!paymentEnabled) {
      return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity }
    }

    const freeCredits = await getFreeCredits()
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, freeCredits - used)

    return {
      allowed: remaining > 0,
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
    }
  } catch {
    // DB 不可用时不阻塞生成
    return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity }
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
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
      [userId]
    ) as any[]

    const used = rows[0]?.used || 0
    const remaining = Math.max(0, freeCredits - used)

    return {
      allowed: remaining > 0,
      paymentEnabled: true,
      total: freeCredits,
      used,
      remaining,
    }
  } catch {
    return { allowed: true, paymentEnabled: false, total: Infinity, used: 0, remaining: Infinity }
  }
}
