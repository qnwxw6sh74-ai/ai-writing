/**
 * AI 模型管理 — 从数据库加载多模型配置
 *
 * 核心职责:
 * 1. getActiveModels()      — 获取所有活跃模型
 * 2. resolveModel()          — 根据关键词或显式 modelId 选择合适的模型
 * 3. buildAIConfigFromModel()— 将 DB 模型转换为 ai-client 可用配置
 */
import pool from "@/lib/db"

export interface AIModel {
  id: number
  name: string
  provider: string
  api_key: string
  base_url: string
  model: string
  max_tokens: number
  temperature: number
  is_active: number
  keyword_triggers: string | null  // JSON array
  sort_order: number
}

export interface AIConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
}

/** 各 provider 默认 API 地址 */
const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com",
  claude: "https://api.anthropic.com",
}

/** 从环境变量构建 fallback 配置 */
export function getEnvAIConfig(): AIConfig {
  const provider = process.env.AI_PROVIDER || "deepseek"
  return {
    provider,
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL || DEFAULT_BASE_URLS[provider] || "https://api.deepseek.com",
    model: process.env.AI_MODEL || "deepseek-chat",
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096"),
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  }
}

/** 将 DB 模型记录转为 AIConfig */
export function buildAIConfigFromModel(m: AIModel): AIConfig {
  const envConfig = getEnvAIConfig()
  return {
    provider: m.provider,
    apiKey: m.api_key || envConfig.apiKey,
    baseUrl: m.base_url || DEFAULT_BASE_URLS[m.provider] || envConfig.baseUrl,
    model: m.model,
    maxTokens: m.max_tokens,
    temperature: m.temperature,
  }
}

/** 获取所有活跃模型（按 sort_order 排序） */
export async function getActiveModels(): Promise<AIModel[]> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM ai_models WHERE is_active = 1 ORDER BY sort_order, id"
    ) as any[]
    return rows as AIModel[]
  } catch {
    return []
  }
}

/** 获取单个模型 */
export async function getModelById(id: number): Promise<AIModel | null> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM ai_models WHERE id = ? AND is_active = 1",
      [id]
    ) as any[]
    return rows.length > 0 ? (rows[0] as AIModel) : null
  } catch {
    return null
  }
}

/**
 * 模型选择逻辑：
 *   1. 指定 modelId → 直接用
 *   2. 关键词匹配 keyword_triggers → 选第一个命中
 *   3. 都没有 → 选 sort_order 最小的（默认模型）
 *
 * 返回选中的模型，或 null（DB 里没有模型，应 fallback 到 env）
 */
export async function resolveModel(
  keyword?: string,
  modelId?: number
): Promise<AIModel | null> {
  const models = await getActiveModels()
  if (models.length === 0) return null

  // 1. 显式指定
  if (modelId) {
    const found = models.find((m) => m.id === modelId)
    if (found) return found
  }

  // 2. 关键词触发匹配
  if (keyword) {
    const kw = keyword.toLowerCase()
    for (const m of models) {
      if (!m.keyword_triggers) continue
      try {
        const triggers: string[] = JSON.parse(m.keyword_triggers)
        if (triggers.some((t) => kw.includes(t.toLowerCase()))) {
          return m
        }
      } catch { /* 解析失败，跳过 */ }
    }
  }

  // 3. 默认（sort_order 最小的）
  return models[0]
}
