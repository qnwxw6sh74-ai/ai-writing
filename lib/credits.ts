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
  /** 免费次数（固定值） */
  total: number
  /** 免费部分已使用次数（按IP） */
  freeUsed: number
  /** 免费剩余 */
  freeRemaining: number
  /** 充值部分已使用次数（按用户） */
  purchasedUsed: number
  /** 充值剩余 */
  purchasedRemaining: number
  /** 总已使用 */
  used: number
  /** 总剩余 */
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
    return Number(rows[0]?.total) || 0
  } catch {
    return 0
  }
}

/**
 * 检查额度 — 双维度计算
 * @param userId 用户标识（登录时=user_id数字，未登录=IP）
 * @param ip     客户端IP（始终传，用于免费额度计算）
 */
export async function checkCredits(userId: string, ip: string): Promise<CreditsResult> {
  try {
    const paymentEnabled = await getPaymentEnabled()
    if (!paymentEnabled) {
      return { allowed: true, paymentEnabled: false, total: Infinity, freeUsed: 0, freeRemaining: Infinity, purchasedUsed: 0, purchasedRemaining: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
    }

    const freeCredits = await getFreeCredits()

    // 免费额度 — 始终按 IP 计算（仅统计近90天）
    const [freeRows] = await pool.execute(
      "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ? AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)",
      [ip]
    ) as any[]
    const freeUsed = Number(freeRows[0]?.used) || 0
    const freeRemaining = Math.max(0, freeCredits - freeUsed)

    // 充值额度 — 仅登录用户（userId 是纯数字）计算
    const isLoggedIn = /^\d+$/.test(userId)
    let purchasedCredits = 0
    let purchasedUsed = 0
    let purchasedRemaining = 0
    if (isLoggedIn) {
      purchasedCredits = await getPurchasedCredits(userId)
      const [userRows] = await pool.execute(
        "SELECT COUNT(*) AS used FROM credits_log WHERE user_identifier = ?",
        [userId]
      ) as any[]
      purchasedUsed = Number(userRows[0]?.used) || 0
      purchasedRemaining = Math.max(0, purchasedCredits - purchasedUsed)
    }

    const totalCredits = freeCredits + purchasedCredits
    const totalUsed = freeUsed + purchasedUsed
    const totalRemaining = freeRemaining + purchasedRemaining

    return {
      allowed: totalRemaining > 0,
      paymentEnabled: true,
      total: freeCredits,
      freeUsed,
      freeRemaining,
      purchasedUsed,
      purchasedRemaining,
      used: totalUsed,
      remaining: totalRemaining,
      purchasedCredits,
    }
  } catch {
    return { allowed: true, paymentEnabled: false, total: Infinity, freeUsed: 0, freeRemaining: Infinity, purchasedUsed: 0, purchasedRemaining: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
  }
}

/**
 * 记录一次使用（生成成功后调用）
 * 优先扣免费额度（写IP），免费用完再扣充值（写user_id）
 */
export async function deductCredits(
  userId: string,
  ip: string,
  action: string = "generate"
): Promise<CreditsResult> {
  try {
    // 先查当前状态，决定扣哪边
    const state = await checkCredits(userId, ip)

    if (!state.allowed) {
      return state
    }

    // 优先扣免费额度（IP），免费用完扣充值（user_id）
    if (state.freeRemaining > 0) {
      await pool.execute(
        "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, ?, 1)",
        [ip, action]
      )
    } else {
      // 充值额度（仅登录用户有）
      await pool.execute(
        "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, ?, 1)",
        [userId, action]
      )
    }

    // 返回更新后状态
    return checkCredits(userId, ip)
  } catch {
    return { allowed: true, paymentEnabled: false, total: Infinity, freeUsed: 0, freeRemaining: Infinity, purchasedUsed: 0, purchasedRemaining: Infinity, used: 0, remaining: Infinity, purchasedCredits: 0 }
  }
}
