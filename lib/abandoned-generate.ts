/**
 * 未确认文章配额回收
 *
 * 游客生成文章后不确认，免费配额被消耗但积分未扣。
 * 30 分钟后自动释放配额，防止滥用。
 */

import pool from "@/lib/db"
import { releaseFreeQuota } from "@/lib/free-quota"

const ABANDON_TIMEOUT_MINUTES = 30

/**
 * 扫描未确认的文章，释放超时的免费配额
 * 可通过定时任务调用（如 setInterval 每 10 分钟）
 */
export async function recoverAbandonedQuotas(): Promise<void> {
  try {
    // 查找 30 分钟前标记为 unconfirmed 的记录
    const [rows] = await pool.execute(
      `SELECT id, user_identifier FROM generate_history
       WHERE status = 'unconfirmed'
         AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
       LIMIT 50`,
      [ABANDON_TIMEOUT_MINUTES]
    ) as any[]

    if (rows.length === 0) return

    for (const row of rows) {
      const ip = row.user_identifier as string
      // 释放免费配额
      releaseFreeQuota(ip, "generate")
      // 标记为 abandoned
      await pool.execute(
        "UPDATE generate_history SET status = 'abandoned' WHERE id = ?",
        [row.id]
      )
    }

    console.log(`[abandoned-generate] 回收了 ${rows.length} 条未确认文章的配额`)
  } catch {
    // 静默失败，不影响主流程
  }
}

// 每 10 分钟执行一次
if (typeof setInterval !== "undefined") {
  setInterval(recoverAbandonedQuotas, 10 * 60 * 1000)
}
