import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'

/** PATCH — 管理员编辑用户 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, data } = body

    if (!['reset_password', 'set_credits', 'reset_usage'].includes(action)) {
      return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }

    // 验证用户存在
    const [exists] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]) as any[][]
    if (!exists.length) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    switch (action) {
      case 'reset_password': {
        if (!data.password || data.password.length < 6) {
          return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
        }
        const hash = await bcrypt.hash(data.password, 10)
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id])
        return NextResponse.json({ success: true, message: '密码已修改' })
      }

      case 'set_credits': {
        const target = parseInt(data.target)
        if (isNaN(target) || target < 0) {
          return NextResponse.json({ error: '无效的额度值' }, { status: 400 })
        }

        // 查询当前已消费
        const [spendRows] = await pool.execute(
          'SELECT COUNT(*) AS total FROM credits_log WHERE user_identifier = ?',
          [id]
        ) as any[][]
        const totalSpent = Number(spendRows[0]?.total) || 0

        // 查询当前已购买
        const [purchaseRows] = await pool.execute(
          'SELECT COALESCE(SUM(credits_added), 0) AS total FROM credits_recharge WHERE user_identifier = ?',
          [id]
        ) as any[][]
        const totalPurchased = Number(purchaseRows[0]?.total) || 0

        // 当前剩余
        const currentRemaining = Math.max(0, totalPurchased - totalSpent)
        const diff = target - currentRemaining

        if (diff !== 0) {
          // INSERT 正数或负数充值记录调整差额
          await pool.execute(
            'INSERT INTO credits_recharge (user_identifier, credits_added, source) VALUES (?, ?, \'admin_adjust\')',
            [id, diff]
          )
        }

        return NextResponse.json({
          success: true,
          message: `额度已设置为 ${target}（当前剩余 ${target}）`,
        })
      }

      case 'reset_usage': {
        await pool.execute('DELETE FROM credits_log WHERE user_identifier = ?', [id])
        return NextResponse.json({ success: true, message: '消费记录已清空' })
      }
    }
  } catch (error) {
    console.error('Admin user edit error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
