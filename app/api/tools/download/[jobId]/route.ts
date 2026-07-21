import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const tempRoot = path.join(os.tmpdir(), 'ai-writing-tools')
    const jobDir = path.join(tempRoot, jobId)

    const files = await fs.readdir(jobDir).catch(() => [])

    if (files.length === 0) {
      return NextResponse.json({ error: 'No output files' }, { status: 404 })
    }

    // Return first file for download
    const filePath = path.join(jobDir, files[0])
    const stat = await fs.stat(filePath)

    const content = await fs.readFile(filePath)

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(files[0])}"`,
        'Content-Length': String(stat.size),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
