import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/** GET — 管理员查看用户列表 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = ''
    const params: any[] = []
    if (search) {
      whereClause = 'WHERE email LIKE ? OR nickname LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    // 用户列表 + 积分统计
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.nickname, u.email_verified, u.total_generations, u.total_exports,
              u.last_export_format, u.preferred_style, u.created_at, u.last_login_at,
              COALESCE(SUM(cr.credits_added), 0) as purchased_credits,
              COALESCE(cl.used_count, 0) as credits_used
       FROM users u
       LEFT JOIN credits_recharge cr ON cr.user_identifier = CAST(u.id AS CHAR)
       LEFT JOIN (
         SELECT user_identifier, COUNT(*) as used_count FROM credits_log GROUP BY user_identifier
       ) cl ON cl.user_identifier = CAST(u.id AS CHAR)
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[]

    // 总数
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    ) as any[]

    // MySQL 聚合函数返回字符串，前端需要数字
    const users = rows.map((r: any) => ({
      ...r,
      purchased_credits: Number(r.purchased_credits) || 0,
      credits_used: Number(r.credits_used) || 0,
    }))

    return NextResponse.json({
      users,
      total: Number(countRows[0]?.total) || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
