import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-user"
import { checkCredits, deductCredits, resolveUserId, getUserIdentifier } from "@/lib/credits"
import { recordFreeUsage } from "@/lib/free-quota"
import pool from "@/lib/db"

export const maxDuration = 15

/**
 * POST /api/generate/assemble
 * 拼接所有段落为完整文章，添加过渡
 * Body: { outlineId }
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { outlineId } = await request.json()
    if (!outlineId) {
      return NextResponse.json({ error: "缺少 outlineId" }, { status: 400 })
    }

    // === 积分检查 + 扣费（链式生成路径：组装时扣）===
    const ip = getUserIdentifier(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const userId = resolveUserId(
      request.headers.get("x-user-payload"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    )
    const creditsCheck = await checkCredits(userId, ip, "assemble")

    if (!creditsCheck.allowed) {
      const msg = creditsCheck.isLoggedIn
        ? "额度已用完，请购买套餐继续使用"
        : `免费次数已用完（${creditsCheck.freeQuotaUsed}/${creditsCheck.freeQuotaTotal}），请登录后购买套餐`
      return NextResponse.json(
        { error: msg, code: "NO_CREDITS", credits: creditsCheck },
        { status: 402 }
      )
    }

    // 扣积分 + 记录免费配额
    const updatedCredits = await deductCredits(userId, ip, "assemble")
    recordFreeUsage(ip, "assemble").catch(() => {})

    // 加载大纲
    const [rows] = await pool.execute(
      `SELECT id, user_id, title, sections, section_contents, keyword, domain, style
       FROM generate_outlines WHERE id = ? AND user_id = ?`,
      [outlineId, user.userId]
    ) as any[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "大纲不存在" }, { status: 404 })
    }

    const outline = rows[0]
    let sections: any[]
    try {
      sections = typeof outline.sections === "string" ? JSON.parse(outline.sections) : outline.sections
    } catch {
      return NextResponse.json({ error: "大纲数据损坏" }, { status: 500 })
    }

    let sectionContents: Record<string, string> = {}
    try {
      sectionContents = outline.section_contents
        ? (typeof outline.section_contents === "string" ? JSON.parse(outline.section_contents) : outline.section_contents)
        : {}
    } catch { /* ignore */ }

    console.log(`[assemble] outlineId=${outlineId}, sections=${sections.length}, sectionContents keys=${Object.keys(sectionContents).join(",")}`)

    // 拼接：标题 + 逐段（HTML格式，兼容 TipTap setContent）
    const parts: string[] = [`<h2>${outline.title}</h2>`]

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const content = sectionContents[String(i)]
      if (!content) continue

      parts.push(`<h3>${section.heading}</h3>`)
      parts.push(`<p>${content.replace(/\n/g, '<br/>')}</p>`)
    }

    const fullArticle = parts.join("\n").trim()

    // 保存到 DB
    try {
      await pool.execute(
        `UPDATE generate_outlines SET full_article = ?, status = 'completed', updated_at = NOW() WHERE id = ?`,
        [fullArticle, outlineId]
      )
    } catch { /* ignore */ }

    return NextResponse.json({
      fullArticle,
      title: outline.title,
      sectionCount: sections.length,
      generatedCount: Object.keys(sectionContents).length,
      credits: updatedCredits,
    })
  } catch (e) {
    console.error("[assemble] error:", e)
    return NextResponse.json({ error: "组装失败，请稍后重试" }, { status: 500 })
  }
}
