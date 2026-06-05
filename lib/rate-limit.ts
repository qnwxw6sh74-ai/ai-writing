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
// ===== 认证频率限制（防暴力破解）=====

const authTracker = new Map<string, { count: number; resetAt: number }>()

const AUTH_LIMITS: Record<string, { max: number; windowMs: number }> = {
  login: { max: 10, windowMs: 60_000 },
  register: { max: 3, windowMs: 60_000 },
  forgotPassword: { max: 2, windowMs: 60_000 },
}

/**
 * 检查认证端点频率限制
 * @param ip 客户端 IP
 * @param endpoint 'login' | 'register' | 'forgotPassword'
 * @returns allowed: 是否允许, retryAfter: 若被限，还需等待秒数
 */
export function checkAuthRateLimit(
  ip: string,
  endpoint: "login" | "register" | "forgotPassword"
): { allowed: boolean; retryAfter: number } {
  const limit = AUTH_LIMITS[endpoint]
  const key = `${ip}:${endpoint}`
  const now = Date.now()

  let entry = authTracker.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + limit.windowMs }
    authTracker.set(key, entry)
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > limit.max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { allowed: true, retryAfter: 0 }
}

// 定期清理（每 5 分钟清除过期的限流记录）
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of authTracker) {
    if (now >= val.resetAt) authTracker.delete(key)
  }
}, 5 * 60_000)

// ===== IP 自动扣费 =====

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
