/**
 * 生成结果缓存 — 相同关键词 1 小时内复用结果
 * 减少 AI token 消耗
 */
import crypto from "crypto"

interface CacheEntry {
  content: string
  cachedAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60_000 // 1 小时
const MAX_SIZE = 200

function makeKey(keyword: string, domain: string, style: string): string {
  const raw = `${keyword}|${domain}|${style}`
  return crypto.createHash("md5").update(raw).digest("hex")
}

export function getCached(keyword: string, domain: string, style: string): string | null {
  const key = makeKey(keyword, domain, style)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.content
}

export function setCached(keyword: string, domain: string, style: string, content: string) {
  if (cache.size >= MAX_SIZE) {
    // 删除最老的 50 条
    const entries = [...cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    entries.slice(0, 50).forEach(([k]) => cache.delete(k))
  }
  cache.set(makeKey(keyword, domain, style), { content, cachedAt: Date.now() })
}
