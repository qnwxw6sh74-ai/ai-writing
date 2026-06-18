/**
 * 免费配额计数器 — 内存+DB 双写
 *
 * 解决两个问题：
 * 1. 自动扣费以 1/3 速率写入导致实际可用 ~3x 免费次数
 * 2. 服务重启后内存计数丢失
 *
 * 设计：
 * - 内存 Map 作为热路径（每次请求检查）
 * - credits_log 作为冷备份（重启恢复，action='free_quota_{type}'）
 * - 按 IP + action 类型分别计数
 * - 每 24 小时自动清理过期条目
 */

import pool from "@/lib/db"
import { getFreeCredits } from "@/lib/config"

// ====== 内存计数器 ======

interface QuotaEntry {
  count: number
  since: number // 时间戳，用于定期清理
}

const quotaMap = new Map<string, QuotaEntry>()

function makeKey(ip: string, action: string): string {
  return `${ip}:${action}`
}

/**
 * 检查免费配额是否还有剩余
 */
export function checkFreeQuota(
  ip: string,
  action: string
): { allowed: boolean; used: number; total: number } {
  const total = getFreeQuotaTotalSync()
  const key = makeKey(ip, action)
  const entry = quotaMap.get(key)
  const used = entry?.count || 0
  return {
    allowed: used < total,
    used,
    total,
  }
}

/**
 * 记录一次免费使用（生成成功后调用）
 * 内存 + DB 双写
 */
export async function recordFreeUsage(ip: string, action: string): Promise<void> {
  const key = makeKey(ip, action)
  const entry = quotaMap.get(key)
  if (entry) {
    entry.count++
  } else {
    quotaMap.set(key, { count: 1, since: Date.now() })
  }

  // 异步写 DB（fire-and-forget，不影响主流程）
  const dbAction = `free_quota_${action}`
  pool.execute(
    "INSERT INTO credits_log (user_identifier, action, credits_used) VALUES (?, ?, 0)",
    [ip, dbAction]
  ).catch(() => { /* DB 不可用时不影响内存计数 */ })
}

/**
 * 释放一次免费配额（退款场景）
 */
export function releaseFreeQuota(ip: string, action: string): void {
  const key = makeKey(ip, action)
  const entry = quotaMap.get(key)
  if (entry && entry.count > 0) {
    entry.count--
  }
}

/**
 * 从 DB 恢复内存计数（服务启动时调用）
 */
export async function restoreFreeQuotaFromDB(): Promise<void> {
  try {
    const [rows] = await pool.execute(
      "SELECT user_identifier, action FROM credits_log WHERE action LIKE 'free_quota_%' AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)"
    ) as any[]

    for (const row of rows) {
      // action 格式: free_quota_generate, free_quota_title, free_quota_image
      const actionType = (row.action as string).replace("free_quota_", "")
      const ip = row.user_identifier as string
      const key = makeKey(ip, actionType)
      const entry = quotaMap.get(key)
      if (entry) {
        entry.count++
      } else {
        quotaMap.set(key, { count: 1, since: Date.now() })
      }
    }
    console.log(`[free-quota] 从 DB 恢复了 ${rows.length} 条免费配额记录`)
  } catch {
    console.warn("[free-quota] DB 恢复失败，从零开始计数")
  }
}

/**
 * 清理过期内存条目（超过 24 小时未活动的 IP）
 */
export function cleanupExpiredQuotas(): void {
  const now = Date.now()
  const TTL = 24 * 60 * 60 * 1000 // 24 小时
  for (const [key, entry] of quotaMap) {
    if (now - entry.since > TTL) {
      quotaMap.delete(key)
    }
  }
}

// 每小时清理一次
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredQuotas, 60 * 60 * 1000)
}

/**
 * 获取免费配额总数（同步版本，用于热路径）
 */
function getFreeQuotaTotalSync(): number {
  const envVal = process.env.FREE_CREDITS
  if (envVal !== undefined && envVal !== "") {
    return Number(envVal) || 0
  }
  return 10
}
