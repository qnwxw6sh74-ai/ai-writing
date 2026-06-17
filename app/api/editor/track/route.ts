import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-user"
import pool from "@/lib/db"

/**
 * POST /api/editor/track
 * 记录用户编辑行为（fire-and-forget）
 * Body: { originalText, editedText, articleHash? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { originalText, editedText, articleHash, sectionIndex, outlineId, actionType } = await request.json()
    if (!originalText && !editedText) {
      return NextResponse.json({ error: "缺少文本数据" }, { status: 400 })
    }
    // 完全相同则跳过（但 ai_generate 类型允许 original 为空）
    if (originalText && originalText === editedText) {
      return NextResponse.json({ tracked: false, reason: "无修改" })
    }

    // === 计算 diff ===
    const originalLen = String(originalText).length
    const editedLen = String(editedText).length
    const addedChars = Math.max(0, editedLen - originalLen)
    const deletedChars = Math.max(0, originalLen - editedLen)
    const changedRatio = originalLen > 0
      ? Math.abs(editedLen - originalLen) / originalLen
      : 1

    // 判断编辑类型
    let editType: "rewrite" | "insert" | "delete"
    if (changedRatio < 0.1) {
      editType = "rewrite" // 微小修改
    } else if (editedLen > originalLen * 1.5) {
      editType = "insert"
    } else if (editedLen <= originalLen * 0.5) {
      editType = "delete"
    } else {
      editType = "rewrite"
    }

    // 编辑范围
    let editScope = "full_text"
    if (changedRatio < 0.3) editScope = "sentence"
    else if (changedRatio < 1.0) editScope = "paragraph"

    // === 写入 DB ===
    const isSectionLevel = sectionIndex !== undefined && sectionIndex !== null
    await pool.execute(
      `INSERT INTO user_edit_history (user_id, article_hash, original_text, edited_text, edit_type, edit_scope, diff_metadata, section_index, outline_id, action_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        articleHash || null,
        String(originalText || ""),
        String(editedText || ""),
        editType,
        editScope,
        JSON.stringify({ addedChars, deletedChars, changedRatio: Math.round(changedRatio * 100) / 100 }),
        isSectionLevel ? sectionIndex : null,
        isSectionLevel ? (outlineId || null) : null,
        isSectionLevel ? (actionType || null) : null,
      ]
    )

    return NextResponse.json({
      tracked: true,
      editType,
      editScope,
      diff: { addedChars, deletedChars, changedRatio: Math.round(changedRatio * 100) / 100 },
    })
  } catch (e) {
    console.error("[editor-track] error:", e)
    return NextResponse.json({ error: "记录失败" }, { status: 500 })
  }
}
