import { NextRequest, NextResponse } from 'next/server'
import { parseUpload } from '@/lib/file-upload'
import { ensureTempDir } from '@/lib/temp-files'
import crypto from 'node:crypto'

export async function POST(request: NextRequest) {
  try {
    const jobId = crypto.randomUUID()
    const tempDir = await ensureTempDir(jobId)

    const { files } = await parseUpload(request, tempDir)

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    return NextResponse.json({
      jobId,
      files: files.map(f => ({
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
      })),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
