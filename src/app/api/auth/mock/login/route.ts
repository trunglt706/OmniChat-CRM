import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkBruteForce } from '@/lib/request-logger'
import { logBlockedRequest } from '@/lib/api-logger'

const SECRET = process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production'

export async function POST(request: Request) {
  try {
    // ─── Brute force protection ───
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const body = await request.json().catch(() => ({}))
    const email = body?.email || ''

    const bf = await checkBruteForce(ip, email || undefined)
    if (bf.blocked) {
      logBlockedRequest({
        method: 'POST', path: '/api/auth/mock/login',
        ip, reason: 'brute_force', status: 429,
      })
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '900',
            'X-Login-Remaining': '0',
          },
        }
      )
    }

    // Look up user from DB
    let user = await db.user.findUnique({ where: { email: email || 'admin@omnichat.vn' } })

    // If user doesn't exist, create one (auto-provision for demo)
    if (!user) {
      user = await db.user.create({
        data: {
          email: email || 'admin@omnichat.vn',
          name: (email || 'admin').split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
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

    // Add remaining attempts header for visibility
    response.headers.set('X-Login-Remaining', String(bf.remainingAttempts))

    return response
  } catch (error) {
    console.error('Mock login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
