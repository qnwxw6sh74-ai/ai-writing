import { NextRequest, NextResponse } from 'next/server'
import { getToolById } from '@/lib/tools/registry'
import { parseUpload } from '@/lib/file-upload'
import { ensureTempDir } from '@/lib/temp-files'
import crypto from 'node:crypto'

export async function POST(request: NextRequest) {
  try {
    const jobId = crypto.randomUUID()
    const tempDir = await ensureTempDir(jobId)

    const { toolId, params } = await request.json()

    if (!toolId || !params?.files) {
      return NextResponse.json({ error: 'Missing toolId or files' }, { status: 400 })
    }

    const tool = getToolById(toolId)
    if (!tool) {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 404 })
    }

    // Parse uploaded files
    const { files } = await parseUpload(request, tempDir)

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    // Validate file types
    const acceptedExts = tool.accepts.map(ext => ext.toLowerCase())
    const fileExts = files.map(f => f.filename.split('.').pop()?.toLowerCase())
    for (const ext of fileExts) {
      if (!acceptedExts.includes(ext)) {
        return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 })
      }
    }

    // Process files
    const result = await tool.handler({
      files: files.map(f => ({ path: f.filepath, filename: f.filename, mimetype: f.mimetype, dir: tempDir })),
      ...params,
    })

    return NextResponse.json({
      jobId,
      result,
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
