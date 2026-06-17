import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-user"
import { getStyleProfile, saveStyleProfile, deleteStyleProfile, migrateFromSiteConfig } from "@/lib/style-profile"
import type { StyleProfile } from "@/lib/style-profile"

/**
 * GET — 获取当前用户的风格档案（含 memes）
 * 首次访问时自动从 site_config 迁移旧数据
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ profile: null, hasStyle: false, error: "未登录" }, { status: 401 })
    }

    let profile = await getStyleProfile(user.userId)

    // 自动迁移旧数据
    if (!profile) {
      profile = await migrateFromSiteConfig(user.userId)
    }

    if (profile) {
      return NextResponse.json({
        profile: profile.profile,
        memes: profile.memes,
        version: profile.version,
        sourceArticleCount: profile.sourceArticleCount,
        hasStyle: true,
      })
    }

    return NextResponse.json({ profile: null, memes: [], hasStyle: false })
  } catch (e) {
    console.error("[style-profile] GET error:", e)
    return NextResponse.json({ profile: null, memes: [], hasStyle: false })
  }
}

/**
 * POST — 保存风格档案（前端主动保存）
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const body = await request.json()
    const { profile, memes } = body

    if (!profile) {
      return NextResponse.json({ error: "缺少风格数据" }, { status: 400 })
    }

    // 验证必填字段
    const requiredFields: (keyof StyleProfile)[] = [
      "avgSentenceLength", "sentencePatterns", "vocabularyPrefs",
      "openingStyle", "endingStyle", "punctuationEmojiHabits",
      "emotionalTemperature", "personUsage", "readerRelationship",
    ]
    for (const field of requiredFields) {
      if (!profile[field] && profile[field] !== "") {
        return NextResponse.json({ error: `缺少风格维度: ${field}` }, { status: 400 })
      }
    }

    const saved = await saveStyleProfile(
      user.userId,
      profile,
      memes || [],
      undefined,
      undefined,
    )

    if (!saved) {
      return NextResponse.json({ error: "保存失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true, version: saved.version })
  } catch (e) {
    console.error("[style-profile] POST error:", e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

/**
 * DELETE — 清除风格档案
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const ok = await deleteStyleProfile(user.userId)
    if (!ok) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[style-profile] DELETE error:", e)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
