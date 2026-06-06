/**
 * Agnes AI 图片生成客户端
 *
 * 使用 Agnes image-2.1-flash 模型进行文生图。
 * API 兼容 OpenAI Images 格式，地址：https://apihub.agnes-ai.com/v1
 *
 * 环境变量：AGNES_API_KEY — 专用于图片生成，与 AI 文字生成 key 分离
 */

const AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1"
const IMAGE_MODEL = "agnes-image-2.1-flash"

export interface GenerateImageParams {
  prompt: string
  size?: string // e.g. "1024x1024", "900x383"
}

export interface GenerateImageResult {
  success: boolean
  imageUrl?: string
  error?: string
}

/**
 * 调用 Agnes 文生图 API
 * 图片尺寸映射：公众号封面 900x383 → "900x383"，方形配图 → "800x800"，横版插图 → "600x400"
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const apiKey = process.env.AGNES_API_KEY
  if (!apiKey) {
    console.error("[image-gen] AGNES_API_KEY 未配置")
    return { success: false, error: "图片生成服务未配置" }
  }

  const size = params.size || "1024x1024"

  try {
    const res = await fetch(`${AGNES_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: params.prompt,
        size,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[image-gen] API ${res.status}:`, err.slice(0, 300))
      return { success: false, error: `图片生成失败 (${res.status})，请稍后重试` }
    }

    const data = await res.json()
    console.log(`[image-gen] 响应 keys: ${Object.keys(data).join(", ")}`)

    // 兼容多种返回格式：OpenAI 标准 / Agnes 实际格式
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
  } catch (e) {
    console.error("[image-gen] 请求失败:", e)
    return { success: false, error: "图片生成服务不可用，请稍后重试" }
  }
}
