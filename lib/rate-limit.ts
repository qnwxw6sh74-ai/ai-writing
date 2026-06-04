/**
 * 生成冷却 & 自动扣费追踪
 *
 * 1. 生成冷却：未确认前再次生成需等 90 秒，确认后立即解除
 * 2. IP 生成计数：未登录用户每 3 次生成自动扣 1 次免费额度（无冷却）
 * 3. 登录用户生成计数：每 5 次生成自动扣 1 次（DB 层，无冷却）
 */

// ===== 生成冷却（90秒，确认解除）=====
const generateTracker = new Map<string, { lastGenerate: number; confirmed: boolean }>()
const GENERATE_COOLDOWN_MS = 90_000

// ===== IP 生成计数（每3次自动扣1次，无冷却）=====
const ipGenTracker = new Map<string, { count: number; lastSeen: number }>()
const IP_DEDUCT_EVERY = 3

// ===== 定期清理（每30分钟清理3小时前的记录）=====
setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60_000
  for (const [key, val] of generateTracker) {
    if (val.lastGenerate < cutoff) generateTracker.delete(key)
  }
  for (const [key, val] of ipGenTracker) {
    if (Date.now() - val.lastSeen > 6 * 60 * 60_000) ipGenTracker.delete(key)
  }
}, 30 * 60_000)

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
 * 每 3 次扣 1 次，无冷却时间
 */
export function checkIPAutoDeduct(ip: string): boolean {
  let track = ipGenTracker.get(ip)
  if (!track) {
    track = { count: 0, lastSeen: Date.now() }
    ipGenTracker.set(ip, track)
  }

  track.count++
  track.lastSeen = Date.now()

  if (track.count >= IP_DEDUCT_EVERY) {
    track.count = 0
    return true
  }

  return false
}
