/**
 * 统一 AI 客户端 — 支持 DeepSeek / OpenAI / Claude / 自定义
 *
 * 配置方式（在 .env.local 或后台站点设置中）：
 *   AI_PROVIDER=deepseek          模型提供商: deepseek | openai | claude | custom
 *   AI_API_KEY=sk-xxx              API Key
 *   AI_BASE_URL=https://...        请求地址（可选，不填用默认）
 *   AI_MODEL=deepseek-chat         模型名称
 *   AI_MAX_TOKENS=4096             最大输出 token
 *   AI_TEMPERATURE=0.7             生成温度
 */

// ===== 各厂商默认地址 =====
const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com",
  claude: "https://api.anthropic.com",
}

// ===== 支持 DeepSeek 结构 =====
interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface AIConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
}

/** 从环境变量构建配置 */
function getAIConfig(): AIConfig {
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

/** 通用 Chat Completion 调用 */
export async function chatCompletion(
  messages: ChatMessage[],
  overrides?: Partial<AIConfig>
): Promise<string | null> {
  const cfg = { ...getAIConfig(), ...overrides }

  if (!cfg.apiKey) {
    console.error("[AI] AI_API_KEY 未配置")
    return null
  }

  const url = `${cfg.baseUrl}/v1/chat/completions`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        max_tokens: cfg.maxTokens,
        temperature: cfg.temperature,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[AI] API 错误 (${res.status}):`, err.slice(0, 200))
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch (e) {
    console.error("[AI] 请求失败:", e)
    return null
  }
}

/** 快速生成文章（可选传入 model overrides 切换模型） */
export async function generateArticle(
  systemPrompt: string,
  userPrompt: string,
  modelOverrides?: Partial<AIConfig>
): Promise<string | null> {
  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], modelOverrides)
}

/** 快速生成标题（可选传入 model overrides 切换模型） */
export async function generateTitles(
  systemPrompt: string,
  userPrompt: string,
  modelOverrides?: Partial<AIConfig>
): Promise<string[]> {
  const text = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: `${userPrompt}\n\n请直接返回5个标题，每行一个，不要编号。` },
  ], modelOverrides)
  if (!text) return []
  return text.split("\n").filter((t: string) => t.trim()).slice(0, 5)
}
