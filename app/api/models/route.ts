import { NextResponse } from "next/server"

/**
 * GET - 公开接口：返回活跃模型列表（仅 id + name，不暴露密钥）
 */
export async function GET() {
  try {
    const { getActiveModels } = await import("@/lib/ai-models")
    const models = await getActiveModels()
    // 只返回前端需要的字段
    const safe = models.map((m) => ({ id: m.id, name: m.name }))
    return NextResponse.json({ models: safe })
  } catch {
    return NextResponse.json({ models: [] })
  }
}
