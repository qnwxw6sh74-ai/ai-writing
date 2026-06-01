import { NextRequest, NextResponse } from "next/server"
import { chatCompletion } from "@/lib/ai-client"
import { resolveModel, buildAIConfigFromModel } from "@/lib/ai-models"

/**
 * POST — 分析用户上传的文章，提取写作风格指纹
 * Body: { texts: string[] } — 至少3篇文章
 * Returns: StyleProfile JSON
 */
export async function POST(request: NextRequest) {
  try {
    const { texts } = await request.json()
    if (!texts || !Array.isArray(texts) || texts.length < 3) {
      return NextResponse.json({ error: "请至少上传3篇文章" }, { status: 400 })
    }

    // 截取每篇前2000字，避免 token 爆炸
    const samples = texts.map((t: string) => t.slice(0, 2000))

    const analysisPrompt = `请仔细阅读以下${samples.length}篇文章，分析作者的写作风格。从以下维度总结：

1. **句式特点**：短句还是长句？平均句长？是否常用排比、对仗？
2. **词汇偏好**：偏口语还是书面语？常用什么类型的词汇？（如成语、网络热词、专业术语）
3. **段落结构**：段落偏长还是偏短？开头和结尾的常见模式？
4. **语气调性**：犀利？温柔？幽默？严肃？娓娓道来？
5. **常用修辞**：比喻、反问、设问、引用名言、讲故事？
6. **文章节奏**：快节奏还是舒缓？信息密度高还是娓娓道来？

请以 JSON 格式输出，key 为英文，value 为中文描述。格式如下：
{
  "sentenceStyle": "...",
  "vocabulary": "...",
  "paragraphStructure": "...",
  "tone": "...",
  "rhetoric": "...",
  "rhythm": "..."
}

以下是用户的文章样本：
${samples.map((s, i) => `\n=== 文章${i + 1} ===\n${s}\n`).join("")}`

    const resolvedModel = await resolveModel()
    const overrides = resolvedModel ? buildAIConfigFromModel(resolvedModel) : undefined

    const result = await chatCompletion(
      [{ role: "user", content: analysisPrompt }],
      { ...overrides, temperature: 0.3, maxTokens: 2000 }
    )

    if (!result) {
      return NextResponse.json({ error: "风格分析失败，请稍后重试" }, { status: 500 })
    }

    // 提取 JSON（可能包裹在 markdown 代码块中）
    let jsonStr = result
    const match = result.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) jsonStr = match[1]
    const styleProfile = JSON.parse(jsonStr.trim())

    return NextResponse.json({ profile: styleProfile })
  } catch (e) {
    console.error("Style analyze error:", e)
    return NextResponse.json({ error: "分析失败，请稍后重试" }, { status: 500 })
  }
}
