import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

const SECRET = process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email || 'admin@omnichat.vn'

    const token = await encode({
      token: {
        sub: 'user_01',
        name: 'Phạm Minh Tuấn',
        email,
        picture: null,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
      secret: SECRET,
    })

    const callbackUrl = new URL(request.url).searchParams.get('callbackUrl') || '/'

    const response = NextResponse.json({ success: true, redirect: callbackUrl })
    response.cookies.set('next-auth.session-token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Mock login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}