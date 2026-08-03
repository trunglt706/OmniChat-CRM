import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email || 'admin@omnichat.vn'

    // Look up user from DB
    let user = await db.user.findUnique({ where: { email } })

    // If user doesn't exist, create one (auto-provision for demo)
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          role: 'admin',
          status: 'online',
        },
      })
    }

    const token = await encode({
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        picture: user.avatar,
        role: user.role,
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
