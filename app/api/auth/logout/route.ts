import { NextResponse } from 'next/server'
import { USER_TOKEN_COOKIE } from '@/lib/auth-user'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(USER_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
