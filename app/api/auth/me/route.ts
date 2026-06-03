import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, verifyUserToken, getUserById, updateUserProfile, verifyPassword, hashPassword, updateUserPassword } from '@/lib/auth-user'
import { checkCredits, getUserIdentifier } from '@/lib/credits'
import pool from '@/lib/db'

/** GET — 获取当前登录用户信息 */
export async function GET(request: NextRequest) {
  // 优先从 middleware 注入的 header 获取，fallback 直接读 cookie
  let user = getUserFromRequest(request)
  if (!user) {
    const token = request.cookies.get('user_token')?.value
    if (token) {
      const payload = await verifyUserToken(token)
      if (payload) user = payload
    }
  }

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const profile = await getUserById(user.userId)
  if (!profile) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  const ip = getUserIdentifier(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  )
  const credits = await checkCredits(profile.id.toString(), ip)

  return NextResponse.json({ ...profile, credits })
}

/** PUT — 更新个人资料 */
export async function PUT(request: NextRequest) {
  let user = getUserFromRequest(request)
  if (!user) {
    const token = request.cookies.get('user_token')?.value
    if (token) {
      const payload = await verifyUserToken(token)
      if (payload) user = payload
    }
  }
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const { nickname, bio, favorite_keywords, preferred_style, currentPassword, newPassword } = await request.json()

    // 修改密码
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
      }

      const [rows] = await pool.execute(
        'SELECT password_hash FROM users WHERE id = ?', [user.userId]
      ) as any[]
      if (!rows.length) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

      const valid = await verifyPassword(currentPassword, rows[0].password_hash)
      if (!valid) {
        return NextResponse.json({ error: '当前密码不正确' }, { status: 400 })
      }

      const newHash = await hashPassword(newPassword)
      await updateUserPassword(user.userId, newHash)
    }

    // 更新个人资料
    const updateData: any = {}
    if (nickname !== undefined) updateData.nickname = nickname
    if (bio !== undefined) updateData.bio = bio
    if (favorite_keywords !== undefined) updateData.favorite_keywords = favorite_keywords
    if (preferred_style !== undefined) updateData.preferred_style = preferred_style

    if (Object.keys(updateData).length > 0) {
      await updateUserProfile(user.userId, updateData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
