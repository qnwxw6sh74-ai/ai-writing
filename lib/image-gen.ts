/**
 * Agnes AI 图片生成客户端
 *
 * 使用 Agnes image-2.1-flash 模型进行文生图。
 * API 兼容 OpenAI Images 格式，地址：https://apihub.agnes-ai.com/v1
 *
 * 异步模式下无 Cloudflare 代理超时限制，单次请求 60s + 2 次重试。
 *
 * 环境变量：AGNES_API_KEY — 专用于图片生成，与 AI 文字生成 key 分离
 */

const AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1"
const IMAGE_MODEL = "agnes-image-2.1-flash"
const FETCH_TIMEOUT_MS = 60_000 // 单次请求超时（异步模式无 Cloudflare 限制）
const MAX_RETRIES = 2 // 最多重试 2 次（共 3 次尝试，最多 3 分钟）

export interface GenerateImageParams {
  prompt: string
  size?: string // e.g. "1024x1024", "900x383"
}

export interface GenerateImageResult {
  success: boolean
  imageUrl?: string
  error?: string
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 调用 Agnes 文生图 API（含超时 + 重试）
 * 图片尺寸映射：公众号封面 900x383 → "900x383"，方形配图 → "800x800"，横版插图 → "600x400"
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const apiKey = process.env.AGNES_API_KEY
  if (!apiKey) {
    console.error("[image-gen] AGNES_API_KEY 未配置")
    return { success: false, error: "图片生成服务未配置" }
  }

  const size = params.size || "1024x1024"

  let lastError: string = "图片生成失败"

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // 重试前等待（1s, 2s）
      await new Promise(r => setTimeout(r, attempt * 1000))
      console.log(`[image-gen] 重试 ${attempt}/${MAX_RETRIES}...`)
    }

    try {
      const res = await fetchWithTimeout(
        `${AGNES_BASE_URL}/images/generations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model: IMAGE_MODEL, prompt: params.prompt, size }),
        },
        FETCH_TIMEOUT_MS,
      )

      if (!res.ok) {
        const err = await res.text()
        console.error(`[image-gen] API ${res.status}:`, err.slice(0, 300))
        // 5xx 可重试，4xx 不重试
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          lastError = `图片生成服务繁忙，正在重试...`
          continue
        }
        return { success: false, error: `图片生成失败 (${res.status})，请稍后重试` }
      }

      const data = await res.json()
      console.log(`[image-gen] 响应 keys: ${Object.keys(data).join(", ")}`)

      const imageUrl =
        data.data?.[0]?.url ||
        data.data?.[0]?.b64_json ||
        data.url ||
        data.image_url ||
        null

      if (!imageUrl) {
        console.error("[image-gen] 未识别的响应结构:", JSON.stringify(data).slice(0, 500))
        return { success: false, error: "图片生成返回格式异常，请稍后重试" }
      }

      return { success: true, imageUrl }
    } catch (e: any) {
      const isTimeout = e?.name === "AbortError" || e?.code === "UND_ERR_HEADERS_TIMEOUT"
      console.error(`[image-gen] 请求失败 (${isTimeout ? "超时" : "网络"}):`, e)
      if (attempt < MAX_RETRIES) {
        lastError = isTimeout ? "图片生成超时，正在重试..." : "网络波动，正在重试..."
        continue
      }
      lastError = isTimeout
        ? "图片生成超时，请稍后重试"
        : "图片生成服务不可用，请稍后重试"
    }
  }

  return { success: false, error: lastError }
}
