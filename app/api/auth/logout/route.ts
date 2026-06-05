import { NextRequest, NextResponse } from 'next/server'
import { USER_TOKEN_COOKIE } from '@/lib/auth-user'
import { invalidateAdminToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // 撤销 admin token（如果存在）
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken) invalidateAdminToken(adminToken)

  const response = NextResponse.json({ success: true })

  // 清除 user token
  response.cookies.set(USER_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  // 清除 admin token
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
