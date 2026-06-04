/**
 * 生成冷却追踪 — 未确认前再次生成需等 90 秒
 * 确认后立即解除冷却
 */
const generateTracker = new Map<string, { lastGenerate: number; confirmed: boolean }>()
const GENERATE_COOLDOWN_MS = 90_000 // 90秒

/** 清理过期记录（每5分钟清理一次） */
setInterval(() => {
  const cutoff = Date.now() - GENERATE_COOLDOWN_MS * 2
  for (const [key, val] of generateTracker) {
    if (val.lastGenerate < cutoff) generateTracker.delete(key)
  }
}, 5 * 60_000)

export function checkGenerateCooldown(key: string): { allowed: boolean; waitSeconds: number } {
  const track = generateTracker.get(key)
  if (!track || track.confirmed) return { allowed: true, waitSeconds: 0 }

  const elapsed = Date.now() - track.lastGenerate
  if (elapsed >= GENERATE_COOLDOWN_MS) return { allowed: true, waitSeconds: 0 }

  return { allowed: false, waitSeconds: Math.ceil((GENERATE_COOLDOWN_MS - elapsed) / 1000) }
}

export function recordGenerate(key: string) {
  generateTracker.set(key, { lastGenerate: Date.now(), confirmed: false })
}

export function confirmGenerate(key: string) {
  const track = generateTracker.get(key)
  if (track) {
    track.confirmed = true
    // 60秒后清理，避免 Map 膨胀
    setTimeout(() => generateTracker.delete(key), 60_000)
  }
}
