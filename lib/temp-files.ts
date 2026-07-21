import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const TEMP_ROOT = path.join(os.tmpdir(), 'ai-writing-tools')

export async function ensureTempDir(jobId: string): Promise<string> {
  const dir = path.join(TEMP_ROOT, jobId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function writeUploadedFile(
  dir: string,
  filename: string,
  data: Buffer
): Promise<string> {
  await fs.mkdir(dir, { recursive: true })
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const filePath = path.join(dir, safeName)
  await fs.writeFile(filePath, data)
  return filePath
}

export async function listFilesInDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

export async function removeJobDir(jobId: string): Promise<void> {
  const dir = path.join(TEMP_ROOT, jobId)
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
}

export async function cleanupExpiredJobs(): Promise<void> {
  try {
    const stat = await fs.stat(TEMP_ROOT).catch(() => null)
    if (!stat) return
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const entries = await fs.readdir(TEMP_ROOT).catch(() => [])
    for (const entry of entries) {
      const fullPath = path.join(TEMP_ROOT, entry)
      const st = await fs.stat(fullPath).catch(() => null)
      if (st && st.mtimeMs < cutoff) {
        await fs.rm(fullPath, { recursive: true, force: true })
      }
    }
  } catch {
    // ignore
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredJobs, 60 * 60 * 1000)
}
