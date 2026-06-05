/**
 * 热点选题 — 双源聚合 + 缓存 + AI 分析 + SSE 推送
 *
 * 数据源：腾讯新闻 | 天行数据（聚合微博/抖音/百度/知乎）
 * 缓存：15 分钟 TTL，内存 Map
 * AI：分析上升趋势 + 写作建议
 */
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"

// ===== 类型 =====
export interface HotTopic {
  id: string
  title: string
  rank: number
  hotScore: number
  source: "tencent" | "weibo" | "douyin" | "tianapi"
}

export interface HotAnalysis {
  topicTitle: string
  trend: "rising" | "stable" | "declining"
  trendLabel: string
  writingPotential: number    // 1-10
  suggestions: string[]       // 写作角度建议
}

interface CacheEntry {
  topics: HotTopic[]
  analysis: HotAnalysis[] | null
  sources: string[]
  errors: string[]
  cachedAt: number
}

// ===== 缓存 =====
const CACHE_TTL_MS = 15 * 60_000
let cache: CacheEntry | null = null

function getCache(): CacheEntry | null {
  if (!cache) return null
  if (Date.now() - cache.cachedAt > CACHE_TTL_MS) return null
  return cache
}

// ===== 数据源 =====

async function fetchTencentTopics(): Promise<HotTopic[]> {
  const res = await fetch(
    "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`Tencent HTTP ${res.status}`)
  const json = await res.json()
  const items = json?.idlist?.[0]?.newslist || json?.newslist || []
  return items.slice(0, 30).map((item: any, i: number) => ({
    id: `tc_${item.id || i}`,
    title: String(item.title || "").trim(),
    rank: i + 1,
    hotScore: Number(item.hotEvent?.hotScore || item.hot_score || 0),
    source: "tencent" as const,
  })).filter((t: HotTopic) => t.title)
}

async function fetchTianapiTopics(): Promise<HotTopic[]> {
  const apiKey = process.env.TIANAPI_KEY
  if (!apiKey) throw new Error("TIANAPI_KEY 未配置")

  const res = await fetch(
    `https://apis.tianapi.com/networkhot/index?key=${apiKey}`,
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`TianAPI HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(`TianAPI ${json.code}: ${json.msg}`)

  const items: any[] = json?.result?.list || []
  // 过滤元数据/栏目头等非热点条目
  const metaKeywords = ["用户最关注的热点", "每10分钟更新", "实时热点", "热门话题", "热搜榜"]
  return items.slice(0, 30).map((item: any, i: number) => ({
    id: `ta_${i}`,
    title: String(item.title || "").trim(),
    rank: i + 1,
    hotScore: Number(item.hotnum || 0),
    source: "tianapi" as const,
  })).filter((t: HotTopic) =>
    t.title && !metaKeywords.some(kw => t.title.includes(kw))
  )
}

// ===== 去重合并 =====

function mergeTopics(allTopics: HotTopic[]): HotTopic[] {
  const seen = new Set<string>()
  const merged: HotTopic[] = []

  for (const t of allTopics) {
    // 用前 20 个字符作相似匹配
    const key = t.title.slice(0, 20).replace(/\s/g, "")
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ ...t, rank: merged.length + 1 })
  }
  return merged.slice(0, 50)
}

// ===== JSON 修复工具 =====

/**
 * 修复 tokens 截断导致的残缺 JSON
 * 原理：从后往前逐字符删除，每删一个尝试闭合括号+引号解析，直到成功
 */
function repairTruncatedJSON(s: string): string | null {
  // 先尝试标准修复
  try { JSON.parse(s) } catch { /* continue */ }
  const repaired = repairJSON(s)
  try { JSON.parse(repaired); return repaired } catch { /* continue */ }

  // 截断修复：从末尾逐字符删除，尝试闭合未完成的字符串和括号
  for (let i = 0; i < Math.min(200, s.length); i++) {
    let candidate = s.slice(0, s.length - i)
    // 如果在字符串中间被截断（奇数个未转义引号），补一个引号
    const quoteCount = (candidate.match(/(?<!\\)"/g) || []).length
    if (quoteCount % 2 !== 0) candidate += '"'
    // 补全缺失的 ] 和 }
    const openArrays = (candidate.match(/\[/g) || []).length
    const closeArrays = (candidate.match(/\]/g) || []).length
    const openObjects = (candidate.match(/\{/g) || []).length
    const closeObjects = (candidate.match(/\}/g) || []).length
    for (let j = 0; j < openArrays - closeArrays; j++) candidate += "]"
    for (let j = 0; j < openObjects - closeObjects; j++) candidate += "}"
    // 移除尾逗号
    candidate = repairJSON(candidate)
    try { JSON.parse(candidate); return candidate } catch { /* 继续尝试 */ }
  }
  return null
}

/** 尝试修复 AI 返回的残缺 JSON（补逗号、去尾逗号、截断修复等） */
function parseAIJson(raw: string): any {
  // 策略1: 直接解析
  try { return JSON.parse(raw) } catch {}

  // 策略2: 提取 ```json ... ``` 代码块
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]) } catch {}
    try { return JSON.parse(repairJSON(codeMatch[1])) } catch {}
  }

  // 策略3: 提取第一个 { 到最后一个 } 之间的内容
  const firstBrace = raw.indexOf("{")
  const lastBrace = raw.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = raw.slice(firstBrace, lastBrace + 1)
    try { return JSON.parse(extracted) } catch {}
    try { return JSON.parse(repairJSON(extracted)) } catch {}
  }

  // 策略4: 修复原始文本再试
  try { return JSON.parse(repairJSON(raw)) } catch {}

  // 策略5: 截断修复（tokens 不足导致 JSON 被截断）
  const truncatedFix = repairTruncatedJSON(raw)
  if (truncatedFix) {
    console.warn(`[hot-topics] JSON 截断已修复，成功解析`)
    return JSON.parse(truncatedFix)
  }

  // 所有策略失败，记录原始返回内容便于排查
  console.error(`[hot-topics] JSON 解析全部失败，AI 原始返回(后100字+前100字): 尾=${raw.slice(-100)} | 头=${raw.slice(0, 100)}`)
  throw new Error("无法解析 AI 返回的 JSON")
}

/** 修复常见 AI JSON 错误：尾逗号、连续逗号、缺逗号 */
function repairJSON(s: string): string {
  return s
    .replace(/,\s*}/g, "}")           // 去除对象尾逗号
    .replace(/,\s*\]/g, "]")           // 去除数组尾逗号
    .replace(/,\s*,/g, ",")            // 去除双逗号
    .replace(/\n\s*"([^"]+)":/g, '\n,"$1":') // 补缺逗号（换行后引号前无逗号）
    .replace(/\}(\s*)\{/g, "},$1{")    // 相邻对象间补逗号
    .replace(/\](\s*)\[/g, "],$1[")    // 相邻数组间补逗号
    .replace(/\](\s*)\{/g, "],$1{")    // 数组对象间补逗号
    .replace(/\}(\s*)\[/g, "},$1[")    // 对象数组间补逗号
    .replace(/^\s*,\s*/m, "")          // 清除行首孤立逗号
}

// ===== AI 分析 =====

async function analyzeTrends(topics: HotTopic[]): Promise<HotAnalysis[]> {
  const topTitles = topics.slice(0, 30).map(t => `${t.rank}. [${t.source}] ${t.title}`).join("\n")

  const systemPrompt = `你是一位资深自媒体运营和数据分析专家。只分析处于上升期的热点话题，筛选最有公众号写作价值的，给出具体写作角度。只返回 JSON，不要任何解释。`

  const userPrompt = `以下是当前全网热搜：

${topTitles}

从以上列表中，仅筛选出处于"上升期"（热度正在快速增长）的话题，最多15个。每个话题给出：
- trend: "rising"
- trendLabel: 简短趋势描述（如"快速上升"）
- writingPotential: 1-10 公众号写作潜力评分
- suggestions: 对评分≥7 的话题给2-3个写作角度

只返回 JSON，格式严格如下（未列出的不做分析）：
{"topics":[{"topicTitle":"话题名","trend":"rising","trendLabel":"快速上升","writingPotential":9,"suggestions":["角度1","角度2"]}]}`

  try {
    const resolvedModel = await resolveModel()
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined
    // 大量话题需要足够输出空间，避免 JSON 截断
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { ...overrides, temperature: 0.3, maxTokens: 8000 }
    )

    if (!result) {
      console.error("[hot-topics] AI 返回为空(null/undefined)")
      throw new Error("AI 返回为空")
    }

    console.log(`[hot-topics] AI 原始返回(前300字): ${result.slice(0, 300)}`)
    const json = parseAIJson(result)

    return (json.topics || []).map((t: any) => ({
      topicTitle: String(t.topicTitle || ""),
      trend: ["rising", "stable", "declining"].includes(t.trend) ? t.trend : "stable",
      trendLabel: String(t.trendLabel || ""),
      writingPotential: Math.min(10, Math.max(1, Number(t.writingPotential) || 5)),
      suggestions: (t.suggestions || []).slice(0, 3).map(String),
    }))
  } catch (e) {
    console.error("[hot-topics] AI 分析失败:", e)
    return [] // AI 失败返回空，不影响热点列表展示
  }
}

// ===== 事件推送（SSE 通知前端）=====

type CacheListener = (data: CacheEntry) => void

function getListeners(): Set<CacheListener> {
  if (!(globalThis as any).__hotTopicsListeners) {
    ;(globalThis as any).__hotTopicsListeners = new Set<CacheListener>()
  }
  return (globalThis as any).__hotTopicsListeners
}

/** SSE 端点调用：订阅缓存更新 */
export function subscribeToHotTopics(cb: CacheListener): () => void {
  const listeners = getListeners()
  listeners.add(cb)
  // 如果有缓存，立即推送
  if (cache) cb(cache)
  return () => { listeners.delete(cb) }
}

function notifyListeners(entry: CacheEntry) {
  for (const cb of getListeners()) {
    try { cb(entry) } catch {}
  }
}

// ===== 主入口 =====

export async function getHotTopics(): Promise<{
  topics: HotTopic[]
  analysis: HotAnalysis[] | null
  sources: string[]
  errors: string[]
  cachedAt: number
  isCached: boolean
}> {
  // 返回缓存（如果有）
  const cached = getCache()
  if (cached) {
    return { ...cached, isCached: true }
  }

  // 并行拉取：腾讯新闻 + 天行数据（聚合微博/抖音/百度/知乎）
  const sources_fns = [
    { name: "tencent", fn: fetchTencentTopics },
    { name: "tianapi", fn: fetchTianapiTopics },
  ] as const

  const results = await Promise.allSettled(sources_fns.map(s => s.fn()))
  const allTopics: HotTopic[] = []
  const sources: string[] = []
  const errors: string[] = []

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      allTopics.push(...r.value)
      sources.push(sources_fns[i].name)
    } else {
      errors.push(`${sources_fns[i].name}: ${r.reason?.message || "未知错误"}`)
    }
  })

  // 合并去重
  const topics = mergeTopics(allTopics)

  // AI 分析（异步，失败不影响）
  let analysis: HotAnalysis[] | null = null
  if (topics.length > 0) {
    analysis = await analyzeTrends(topics)
    if (analysis.length === 0) analysis = null
  }

  // 写缓存
  const entry: CacheEntry = {
    topics,
    analysis,
    sources,
    errors,
    cachedAt: Date.now(),
  }
  cache = entry
  notifyListeners(entry)

  return { ...entry, isCached: false }
}

// ===== 自动刷新（每 15 分钟拉取一次，保持热点新鲜）=====
if (typeof globalThis !== "undefined" && !(globalThis as any).__hotTopicsTimer) {
  ;(globalThis as any).__hotTopicsTimer = setInterval(() => {
    const prevAnalysis = cache?.analysis  // 保留旧 AI 分析，防止刷新时 AI 失败丢失分析
    cache = null
    getHotTopics().then((result) => {
      // 如果新分析为空但旧分析有效，将旧分析合并到新缓存（话题可能变化但比全丢好）
      if (!result.analysis && prevAnalysis) {
        const entry: CacheEntry = {
          topics: result.topics,
          analysis: prevAnalysis,
          sources: result.sources,
          errors: [...result.errors, "AI 分析暂时不可用，显示上一次分析结果"],
          cachedAt: result.cachedAt,
        }
        cache = entry
        notifyListeners(entry)
      }
    }).catch(() => { /* 网络/API 失败，等待下一个周期 */ })
  }, CACHE_TTL_MS)
}
