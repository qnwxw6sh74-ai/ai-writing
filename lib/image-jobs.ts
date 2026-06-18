/**
 * 图片生成异步任务管理
 *
 * 问题：Agnes API 响应慢（10-30s），Cloudflare 免费版代理超时 100s，
 * 同步等待容易触发 504 Gateway Timeout。
 *
 * 方案：生成请求立即返回 jobId，后台执行，前端轮询状态。
 *
 * 积分策略（v3）：请求时即时扣费，生成失败则退款。
 */

import { generateImage, type GenerateImageResult } from "./image-gen"
import { releaseFreeQuota } from "./free-quota"
import pool from "./db"

interface ImageJob {
  id: string
  status: "pending" | "done" | "error"
  imageUrl?: string
  error?: string
  createdAt: number
  /** 扣费用：userId 和 ip */
  userId: string
  ip: string
}

// 内存存储（重启丢失，可接受）
const jobs = new Map<string, ImageJob>()

// 每 5 分钟清理已完成/超时的任务
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (job.status !== "pending" || now - job.createdAt > 300_000) {
      jobs.delete(id)
    }
  }
}, 300_000)

/**
 * 创建异步任务，返回任务 ID。
 * 积分已在请求时扣除，此处仅在失败时退款。
 */
export function createImageJob(prompt: string, size: string, userId: string, ip: string): string {
  const id = randomJobId()
  const job: ImageJob = { id, status: "pending", createdAt: Date.now(), userId, ip }
  jobs.set(id, job)

  // 后台执行（不 await）
  generateImage({ prompt, size })
    .then(async (result) => {
      const j = jobs.get(id)
      if (!j) return
      if (result.success) {
        // 生成成功 → 积分已扣，无需操作
        j.status = "done"
        j.imageUrl = result.imageUrl
        console.log(`[image-jobs] ${id} 成功`)
      } else {
        // 生成失败 → 退款
        j.status = "error"
        j.error = result.error
        await refundCredits(j)
        console.log(`[image-jobs] ${id} 失败，已退款`)
      }
    })
    .catch(async (e) => {
      const j = jobs.get(id)
      if (j) {
        j.status = "error"
        j.error = `生成异常: ${String(e).slice(0, 200)}`
        await refundCredits(j)
        console.log(`[image-jobs] ${id} 异常，已退款`)
      }
    })

  return id
}

/** 查询任务状态 */
export function getImageJob(id: string): ImageJob | null {
  return jobs.get(id) ?? null
}

/** 退款：删除一条积分记录 + 释放免费配额 */
async function refundCredits(job: { userId: string; ip: string }): Promise<void> {
  try {
    // 删除最新的 image 积分记录（可能按IP或userId写入，取决于当时免费额度是否还有剩余）
    const [rows] = await pool.execute(
      "SELECT id, user_identifier FROM credits_log WHERE action = 'image' AND (user_identifier = ? OR user_identifier = ?) ORDER BY id DESC LIMIT 1",
      [job.ip, job.userId]
    ) as any[]
    if (rows.length > 0) {
      await pool.execute("DELETE FROM credits_log WHERE id = ?", [rows[0].id])
    }
    // 释放免费配额
    releaseFreeQuota(job.ip, "image")
  } catch { /* ignore */ }
}

function randomJobId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
