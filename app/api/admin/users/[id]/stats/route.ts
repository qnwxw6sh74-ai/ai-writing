import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/** GET — 获取单个用户的详细统计数据 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 基础信息
    const [userRows] = await pool.execute(
      'SELECT id, email, nickname, email_verified, total_generations, total_exports, created_at, last_login_at FROM users WHERE id = ?',
      [id]
    ) as any[][]

    if (!userRows.length) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const user = userRows[0]

    // 累计消费（credits_log 中该用户的记录数）
    const [spendRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM credits_log WHERE user_identifier = ?',
      [id]
    ) as any[][]
    const totalSpent = Number(spendRows[0]?.total) || 0

    // 累计购买
    const [purchaseRows] = await pool.execute(
      'SELECT COALESCE(SUM(credits_added), 0) AS total FROM credits_recharge WHERE user_identifier = ?',
      [id]
    ) as any[][]
    const totalPurchased = Number(purchaseRows[0]?.total) || 0

    // 剩余
    const remaining = Math.max(0, totalPurchased - totalSpent)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        email_verified: user.email_verified,
        total_generations: user.total_generations,
        total_exports: user.total_exports,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
      stats: {
        total_spent,
        total_purchased,
        remaining,
      },
    })
  } catch (error) {
    console.error('Admin user stats error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
