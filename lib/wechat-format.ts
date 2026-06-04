/**
 * 公众号排版工具 + 敏感词检测
 */

// 常见敏感词（可扩展）
const SENSITIVE_WORDS = [
  "代开发票", "走私", "毒品", "枪支", "色情", "赌博",
  "高利贷", "传销", "邪教", "颠覆", "分裂",
  "翻墙", "VPN推荐", "政治敏感", "领导人",
]

interface FormatResult {
  text: string
  warnings: string[]
}

/** 公众号排版：段落间加空行、首段前不加 */
export function formatForWechat(text: string): string {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // 保留非空行；空行只保留一个（合并连续空行）
      if (line === "") {
        if (i > 0 && arr[i - 1] === "") return false
        return true
      }
      return true
    })
    .join("\n\n") // 段落间双换行
    .trim()
}

/** 敏感词检测，返回命中的词列表 */
export function detectSensitive(text: string): string[] {
  const found: string[] = []
  const lower = text.toLowerCase()
  for (const word of SENSITIVE_WORDS) {
    if (lower.includes(word)) found.push(word)
  }
  return found
}

/** 综合检测并排版 */
export function processForWechat(text: string): FormatResult {
  const warnings = detectSensitive(text)
  let formatted = formatForWechat(text)

  // 如果检测到敏感词，在文末添加提醒
  if (warnings.length > 0) {
    formatted += `\n\n---\n⚠️ 检测到以下敏感词：${warnings.join("、")}，建议修改后发布。`
  }

  return { text: formatted, warnings }
}
