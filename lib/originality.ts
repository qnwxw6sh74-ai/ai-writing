/**
 * 原创检测引擎 — 双层分析架构
 *
 * 第一层（本地统计）：词汇多样性、句式变化、短语重复、可读性 — 无依赖、零延迟
 * 第二层（AI 语义）：调 LLM 深度分析内容原创性、提供段落级建议
 */

// ============================================================
// 本地统计分析
// ============================================================

export interface LocalAnalysisResult {
  score: number
  wordCount: number
  uniqueWordRatio: number
  sentenceVariety: number
  repeatedPhrases: number
  readabilityScore: number
  avgSentenceLen: number
  longSentencePositions: number[]
  suggestionHints: string[]
}

/** 中文分句（按 。！？；换行 分割） */
function splitSentences(text: string): string[] {
  return text
    .split(/[。！？；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** 中文分词（简易：按标点、空格切分，去除非中文字符） */
function tokenize(text: string): string[] {
  // 提取所有中文词（2字及以上）和英文单词
  const chineseWords = text.match(/[一-龥]{1,4}/g) || []
  const englishWords = text.match(/[a-zA-Z]+/g) || []
  return [...chineseWords, ...englishWords.map(w => w.toLowerCase())]
}

/** 计算 n-gram */
function getNgrams(words: string[], n: number): string[] {
  const result: string[] = []
  for (let i = 0; i <= words.length - n; i++) {
    result.push(words.slice(i, i + n).join(''))
  }
  return result
}

/** 本地统计分析 */
export function analyzeTextLocal(text: string): LocalAnalysisResult {
  const wordCount = text.length
  const sentences = splitSentences(text)
  const words = tokenize(text)

  // 1. 词汇多样性 (TTR: type-token ratio)
  const uniqueWords = new Set(words)
  const uniqueWordRatio = words.length > 0 ? uniqueWords.size / words.length : 0

  // 2. 句式变化（句长变异系数）
  const sentLengths = sentences.map(s => s.length)
  const avgSentenceLen = sentLengths.length > 0
    ? sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length
    : 0
  const variance = sentLengths.length > 0
    ? sentLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLen, 2), 0) / sentLengths.length
    : 0
  const stdDev = Math.sqrt(variance)
  const sentenceVariety = avgSentenceLen > 0 ? Math.min(1, stdDev / avgSentenceLen) : 0

  // 3. 短语重复检测（3-gram）
  const trigrams = getNgrams(words, 3)
  const trigramFreq = new Map<string, number>()
  trigrams.forEach(t => trigramFreq.set(t, (trigramFreq.get(t) || 0) + 1))
  let repeatedPhrases = 0
  trigramFreq.forEach(count => { if (count >= 3) repeatedPhrases++ })

  // 4. 可读性（中文适配：句长越适中越好，15-40字为佳）
  const idealRange = sentLengths.filter(l => l >= 15 && l <= 60).length
  const readabilityScore = sentLengths.length > 0
    ? Math.round((idealRange / sentLengths.length) * 100)
    : 50

  // 5. 过长句检测（>80字标记位置）
  const longSentencePositions = sentLengths
    .map((len, i) => (len > 80 ? i + 1 : -1))
    .filter(i => i > 0)

  // 6. 生成建议
  const suggestionHints: string[] = []
  if (uniqueWordRatio < 0.4) suggestionHints.push('词汇多样性偏低，建议增加同义词替换和多样化表达')
  if (sentenceVariety < 0.25) suggestionHints.push('句式变化不足，建议交替使用长短句，避免单调')
  if (repeatedPhrases > 5) suggestionHints.push(`检测到 ${repeatedPhrases} 处高频重复词组，建议修改或删除重复内容`)
  if (longSentencePositions.length > 3) suggestionHints.push(`有 ${longSentencePositions.length} 个过长句子（>80字），建议拆分以提高可读性`)
  if (avgSentenceLen > 60) suggestionHints.push('平均句长偏长（>60字），建议缩短句子，控制在20-40字之间')
  if (avgSentenceLen < 8 && sentences.length > 5) suggestionHints.push('句子过短偏多，建议适当合并短句，增强行文连贯性')
  if (readabilityScore < 40) suggestionHints.push('可读性较低，建议优化句子结构和段落分配')

  // 7. 综合评分
  const varietyScore = Math.round(uniqueWordRatio * 100)
  const sentenceScore = Math.round(sentenceVariety * 100)
  const repetitionPenalty = Math.min(30, repeatedPhrases * 3)

  const score = Math.max(0, Math.min(98, Math.round(
    varietyScore * 0.30 +
    sentenceScore * 0.25 +
    (100 - repetitionPenalty) * 0.20 +
    readabilityScore * 0.15 +
    Math.min(100, (1 - longSentencePositions.length / Math.max(1, sentences.length)) * 100) * 0.10
  )))

  return {
    score,
    wordCount,
    uniqueWordRatio: Math.round(uniqueWordRatio * 100),
    sentenceVariety: Math.round(sentenceVariety * 100),
    repeatedPhrases,
    readabilityScore,
    avgSentenceLen: Math.round(avgSentenceLen),
    longSentencePositions,
    suggestionHints,
  }
}

// ============================================================
// AI 语义分析（调用现有 LLM）
// ============================================================

export interface AIAnalysisResult {
  analysis: string
  similarPatterns: string
  suggestions: string[]
  aiScore: number
}

/**
 * 调用 AI 进行深度原创性分析
 * 复用现有 AI 基础设施（lib/ai-client.ts 的 chatCompletion）
 */
export async function aiAnalyzeOriginality(
  text: string,
  chatCompletion: (messages: any[], overrides?: any) => Promise<string | null>,
  overrides?: any
): Promise<AIAnalysisResult | null> {
  const truncatedText = text.slice(0, 3000)

  const prompt = `请作为内容原创性检测专家，分析以下文本的原创程度。从以下维度评估：

1. **内容原创性**：是否有明显的模板化表达或套话？观点是否独特？
2. **常见套路检测**：是否出现公众号常见的套路句式？（如"最近有个读者问我""你有没有发现""成年人的崩溃"等）
3. **信息密度**：内容是否有实质性信息，还是大量填充？
4. **表达独特性**：语言风格是否有个性，还是千篇一律？

请以 JSON 格式返回（不要 markdown 代码块）：
{
  "analysis": "整体原创性评价（2-3句）",
  "similarPatterns": "检测到的常见套路/模板表达（如无则写'未检测到明显套路'）",
  "suggestions": ["具体优化建议1", "建议2", "建议3"],
  "aiScore": 85
}

待分析文本：
${truncatedText}`

  try {
    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      { ...overrides, temperature: 0.3, maxTokens: 1500 }
    )

    if (!result) return null

    // 提取 JSON
    let jsonStr = result
    const match = result.match(/\{[\s\S]*\}/)
    if (match) jsonStr = match[0]

    const parsed = JSON.parse(jsonStr)
    return {
      analysis: parsed.analysis || '分析完成',
      similarPatterns: parsed.similarPatterns || '未检测到明显套路',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      aiScore: typeof parsed.aiScore === 'number' ? Math.max(0, Math.min(100, parsed.aiScore)) : 70,
    }
  } catch {
    return null
  }
}

// ============================================================
// 综合输出类型
// ============================================================

export interface OriginalityReport {
  score: number
  wordCount: number
  details: {
    uniqueWordRatio: number
    sentenceVariety: number
    repeatedPhrases: number
    readabilityScore: number
  }
  suggestions: string[]
  analysis?: string
  method: "local" | "local+ai"
}
