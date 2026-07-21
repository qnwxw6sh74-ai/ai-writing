import { NextRequest, NextResponse } from 'next/server'
import { listFilesInDir } from '@/lib/temp-files'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const files = await listFilesInDir(`/tmp/ai-writing-tools/${jobId}`)

    return NextResponse.json({
      jobId,
      status: 'completed',
      outputFiles: files.map(f => ({
        filename: f,
        path: `/tmp/ai-writing-tools/${jobId}/${f}`,
      })),
    })
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
