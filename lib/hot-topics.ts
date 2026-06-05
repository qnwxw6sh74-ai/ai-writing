/**
 * 热点选题 — 三源聚合 + 缓存 + AI 分析
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

// ===== AI 分析 =====

async function analyzeTrends(topics: HotTopic[]): Promise<HotAnalysis[]> {
  const topTitles = topics.slice(0, 30).map(t => `${t.rank}. [${t.source}] ${t.title}`).join("\n")

  const systemPrompt = `你是一位资深自媒体运营和数据分析专家，擅长识别处于上升期的热点话题。请根据当前热点列表，筛选出最有公众号写作价值的话题，给出具体写作建议。`

  const userPrompt = `以下是当前全网热搜话题列表：

${topTitles}

请分析：
1. 哪些话题处于"上升期"（热度快速增长）？哪些已"稳定"？哪些在"下降"？
2. 对每个上升期话题，给出 1-10 分的"公众号写作潜力"评分
3. 对评分≥7 的话题，给出 2-3 个具体的写作角度建议

请严格按照以下 JSON 格式返回（不要包含其他文字）：
{
  "topics": [
    {
      "topicTitle": "话题名称",
      "trend": "rising",
      "trendLabel": "上升期",
      "writingPotential": 9,
      "suggestions": ["角度1", "角度2"]
    }
  ]
}`

  try {
    const resolvedModel = await resolveModel()
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { ...overrides, temperature: 0.3, maxTokens: 3000 }
    )

    if (!result) throw new Error("AI 返回为空")

    // 提取 JSON
    const match = result.match(/```(?:json)?\s*([\s\S]*?)```/) || result.match(/(\{[\s\S]*\})/)
    const json = match ? JSON.parse(match[1]) : JSON.parse(result)

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

  return { ...entry, isCached: false }
}

// ===== 自动刷新（每 15 分钟拉取一次，保持热点新鲜）=====
if (typeof globalThis !== "undefined" && !(globalThis as any).__hotTopicsTimer) {
  ;(globalThis as any).__hotTopicsTimer = setInterval(() => {
    cache = null
    getHotTopics().catch(() => {})
  }, CACHE_TTL_MS)
}
