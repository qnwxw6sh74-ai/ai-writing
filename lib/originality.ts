import crypto from 'crypto'

/**
 * 原创检测引擎 — 双层分析架构
 *
 * 第一层（本地统计）：词汇多样性、句式变化、短语重复、可读性 — 无依赖、零延迟
 * 第二层（AI 语义）：调 LLM 深度分析内容原创性、提供段落级建议
 */

// ============================================================
// 常量
// ============================================================

const MIN_TEXT_LENGTH = 50
const MAX_AI_TEXT_LENGTH = 3000
const LONG_SENTENCE_THRESHOLD = 80
const IDEAL_SENTENCE_MIN = 15
const IDEAL_SENTENCE_MAX = 60
const REPETITION_THRESHOLD = 3
const LOW_VOCABULARY_THRESHOLD = 0.4
const LOW_VARIETY_THRESHOLD = 0.25
const HIGH_REPETITION_THRESHOLD = 5
const LONG_SENTENCE_COUNT_THRESHOLD = 3
const LONG_AVG_SENTENCE_THRESHOLD = 60
const SHORT_AVG_SENTENCE_THRESHOLD = 8
const LOW_READABILITY_THRESHOLD = 40

// ============================================================
// 安全工具
// ============================================================

/** HTML 特殊字符转义 — 防止 XSS */
function escapeHtml(unsafe: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return unsafe.replace(/[&<>"']/g, c => map[c] || c)
}

/** 对解析后的对象递归转义所有字符串字段 */
function sanitizeStrings(obj: any): any {
  if (typeof obj === 'string') return escapeHtml(obj)
  if (Array.isArray(obj)) return obj.map(sanitizeStrings)
  if (obj && typeof obj === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeStrings(v)
    }
    return out
  }
  return obj
}

/** 文本脱敏 — 移除手机号、邮箱等敏感信息后送往 AI */
function sanitizeForAI(text: string): string {
  return text
    .replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[邮箱已隐藏]')
}

// ============================================================
// 分析缓存
// ============================================================

const analysisCache = new Map<string, LocalAnalysisResult>()
const CACHE_MAX_SIZE = 200

function getCacheKey(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex')
}

function pruneCache(): void {
  if (analysisCache.size > CACHE_MAX_SIZE) {
    // 删除最旧的一半条目
    const keys = [...analysisCache.keys()]
    for (let i = 0; i < keys.length / 2; i++) {
      analysisCache.delete(keys[i])
    }
  }
}

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

/** 本地统计分析（核心逻辑，不含缓存） */
function analyzeTextLocalCore(text: string): LocalAnalysisResult {
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
  trigramFreq.forEach(count => { if (count >= REPETITION_THRESHOLD) repeatedPhrases++ })

  // 4. 可读性（中文适配：句长越适中越好）
  const idealRange = sentLengths.filter(l => l >= IDEAL_SENTENCE_MIN && l <= IDEAL_SENTENCE_MAX).length
  const readabilityScore = sentLengths.length > 0
    ? Math.round((idealRange / sentLengths.length) * 100)
    : 50

  // 5. 过长句检测
  const longSentencePositions = sentLengths
    .map((len, i) => (len > LONG_SENTENCE_THRESHOLD ? i + 1 : -1))
    .filter(i => i > 0)

  // 6. 生成建议
  const suggestionHints: string[] = []
  if (uniqueWordRatio < LOW_VOCABULARY_THRESHOLD) suggestionHints.push('词汇多样性偏低，建议增加同义词替换和多样化表达')
  if (sentenceVariety < LOW_VARIETY_THRESHOLD) suggestionHints.push('句式变化不足，建议交替使用长短句，避免单调')
  if (repeatedPhrases > HIGH_REPETITION_THRESHOLD) suggestionHints.push(`检测到 ${repeatedPhrases} 处高频重复词组，建议修改或删除重复内容`)
  if (longSentencePositions.length > LONG_SENTENCE_COUNT_THRESHOLD) suggestionHints.push(`有 ${longSentencePositions.length} 个过长句子（>${LONG_SENTENCE_THRESHOLD}字），建议拆分以提高可读性`)
  if (avgSentenceLen > LONG_AVG_SENTENCE_THRESHOLD) suggestionHints.push(`平均句长偏长（>${LONG_AVG_SENTENCE_THRESHOLD}字），建议缩短句子，控制在20-40字之间`)
  if (avgSentenceLen < SHORT_AVG_SENTENCE_THRESHOLD && sentences.length > 5) suggestionHints.push('句子过短偏多，建议适当合并短句，增强行文连贯性')
  if (readabilityScore < LOW_READABILITY_THRESHOLD) suggestionHints.push('可读性较低，建议优化句子结构和段落分配')

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

/** 本地统计分析（带缓存） */
export function analyzeTextLocal(text: string): LocalAnalysisResult {
  const cacheKey = getCacheKey(text)
  const cached = analysisCache.get(cacheKey)
  if (cached) return cached

  const result = analyzeTextLocalCore(text)
  pruneCache()
  analysisCache.set(cacheKey, result)
  return result
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
  const sanitizedText = sanitizeForAI(text)
  const truncatedText = sanitizedText.slice(0, MAX_AI_TEXT_LENGTH)

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

    const parsed = sanitizeStrings(JSON.parse(jsonStr))
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
