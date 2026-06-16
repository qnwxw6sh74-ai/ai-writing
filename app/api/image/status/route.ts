import { NextRequest, NextResponse } from "next/server"
import { getImageJob } from "@/lib/image-jobs"

export const maxDuration = 5

/**
 * GET /api/image/status?jobId=xxx
 * 查询图片生成任务状态
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "缺少 jobId" }, { status: 400 })
  }

  const job = getImageJob(jobId)
  if (!job) {
    return NextResponse.json({ error: "任务不存在或已过期" }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    imageUrl: job.imageUrl ?? undefined,
    error: job.error ?? undefined,
  })
}
