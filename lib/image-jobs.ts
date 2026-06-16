/**
 * 图片生成异步任务管理
 *
 * 问题：Agnes API 响应慢（10-30s），Cloudflare 免费版代理超时 100s，
 * 同步等待容易触发 504 Gateway Timeout。
 *
 * 方案：生成请求立即返回 jobId，后台执行，前端轮询状态。
 */

import { generateImage, type GenerateImageResult } from "./image-gen"

interface ImageJob {
  id: string
  status: "pending" | "done" | "error"
  imageUrl?: string
  error?: string
  createdAt: number
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

/** 创建异步任务，返回任务 ID */
export function createImageJob(prompt: string, size: string): string {
  const id = randomJobId()
  const job: ImageJob = { id, status: "pending", createdAt: Date.now() }
  jobs.set(id, job)

  // 后台执行（不 await）
  generateImage({ prompt, size })
    .then((result) => {
      const j = jobs.get(id)
      if (j) {
        j.status = result.success ? "done" : "error"
        j.imageUrl = result.imageUrl
        j.error = result.error
      }
    })
    .catch((e) => {
      const j = jobs.get(id)
      if (j) {
        j.status = "error"
        j.error = `生成异常: ${String(e).slice(0, 200)}`
      }
    })

  return id
}

/** 查询任务状态 */
export function getImageJob(id: string): ImageJob | null {
  return jobs.get(id) ?? null
}

function randomJobId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
