/**
 * 生成冷却 & 自动扣费追踪
 *
 * 1. 生成冷却：未确认前再次生成需等 90 秒，确认后立即解除
 * 2. IP 生成计数：未登录用户每 3 次生成自动扣 1 次免费额度（2分钟冷却）
 * 3. 登录用户生成计数：每 5 次生成自动扣 1 次（DB 层处理，此处不做）
 */

// ===== 生成冷却（90秒，确认解除）=====
const generateTracker = new Map<string, { lastGenerate: number; confirmed: boolean }>()
const GENERATE_COOLDOWN_MS = 90_000

// ===== IP 生成计数（每3次自动扣1次）=====
const ipGenTracker = new Map<string, { count: number; cooldownUntil: number }>()
const IP_DEDUCT_EVERY = 3
const IP_DEDUCT_COOLDOWN_MS = 2 * 60_000

// ===== 定期清理 =====
function pruneMap<K>(map: Map<K, { lastGenerate?: number; cooldownUntil?: number; count?: number }>, maxAgeMs: number) {
  const cutoff = Date.now() - maxAgeMs
  for (const [key, val] of map) {
    const ts = (val as any).lastGenerate || (val as any).cooldownUntil || 0
    if (ts < cutoff) map.delete(key)
  }
}
setInterval(() => {
  pruneMap(generateTracker, GENERATE_COOLDOWN_MS * 3)
  pruneMap(ipGenTracker, IP_DEDUCT_COOLDOWN_MS * 10)
}, 5 * 60_000)

// ===== 生成冷却 API =====

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
    setTimeout(() => generateTracker.delete(key), 60_000)
  }
}

// ===== IP 自动扣费 =====

/**
 * 记录一次 IP 生成，返回是否需要自动扣费
 * 调用时机：生成成功后
 */
export function checkIPAutoDeduct(ip: string): boolean {
  let track = ipGenTracker.get(ip)
  if (!track) {
    track = { count: 0, cooldownUntil: 0 }
    ipGenTracker.set(ip, track)
  }

  track.count++
  const now = Date.now()

  if (track.count >= IP_DEDUCT_EVERY && now >= track.cooldownUntil) {
    track.count = 0
    track.cooldownUntil = now + IP_DEDUCT_COOLDOWN_MS
    return true
  }

  return false
}
