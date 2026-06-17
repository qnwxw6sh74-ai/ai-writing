/**
 * 风格增强 Prompt 构建器 — 统一的风格/模因/禁语注入
 *
 * generate、outline、section 三个路由共用
 */

import { getStyleProfile } from "@/lib/style-profile"
import { getMemesForUser, selectRandomMemes, buildMemePrompt } from "@/lib/style-meme"
import { buildForbiddenPrompt } from "@/lib/forbidden-phrases"

export interface StyleAugmentResult {
  systemPrompt: string
  usedMemeIds: number[]
}

/**
 * 将风格参数、随机模因、AI 禁语注入到 System Prompt
 * @param baseSystemPrompt 基础 System Prompt（来自 prompt_templates）
 * @param userId 用户 ID（<=0 表示未登录，跳过风格加载）
 * @param memeCount 随机选取的 meme 数量（默认 2）
 */
export async function augmentSystemPrompt(
  baseSystemPrompt: string,
  userId: number,
  memeCount: number = 2,
): Promise<StyleAugmentResult> {
  let systemPrompt = baseSystemPrompt
  let usedMemeIds: number[] = []

  // 1. 风格参数 + 模因
  if (userId > 0) {
    try {
      const styleProfile = await getStyleProfile(userId)
      if (styleProfile) {
        // 风格参数表（9 维度）
        const styleDesc = Object.entries(styleProfile.profile)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => `【${k}】${v}`)
          .join("\n")
        if (styleDesc) {
          systemPrompt = `${systemPrompt}\n\n【用户风格参数 — 请严格按以下风格特征写作】\n${styleDesc}`
        }

        // 风格模因
        const allMemes = await getMemesForUser(userId)
        if (allMemes.length > 0) {
          const selected = selectRandomMemes(allMemes, memeCount)
          const memePrompt = buildMemePrompt(selected)
          if (memePrompt) {
            systemPrompt = `${systemPrompt}\n\n${memePrompt}`
            usedMemeIds = selected.map(m => m.id)
          }
        }
      }
    } catch { /* 风格加载失败不影响生成 */ }
  }

  // 2. AI 禁语库
  try {
    const forbiddenPrompt = await buildForbiddenPrompt()
    if (forbiddenPrompt) {
      systemPrompt = `${systemPrompt}\n\n${forbiddenPrompt}`
    }
  } catch { /* 禁语加载失败不影响生成 */ }

  return { systemPrompt, usedMemeIds }
}
