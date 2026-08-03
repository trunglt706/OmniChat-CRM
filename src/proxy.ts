import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ─── In-memory rate limit store ───
interface RateLimitEntry {
  count: number
  resetAt: number
}
const rateLimitStore = new Map<string, RateLimitEntry>()

// Default rate limit: can be overridden via RATE_LIMIT_PER_MINUTE env var
const DEFAULT_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10)

// ─── Routes that don't require auth ───
const PUBLIC_PATHS = ['/login', '/api/auth']

// ─── API routes to rate-limit ───
const RATE_LIMITED_API_PREFIXES = [
  '/api/conversations', '/api/customers', '/api/dashboard',
  '/api/reports', '/api/bot', '/api/simulation', '/api/agents',
  '/api/tags', '/api/automation', '/api/channels',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'

  // ─── 1. Auth guard ───
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files

  if (!isPublic) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production',
      })
      if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch {
      // If token check fails (e.g., no cookie), redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─── 2. Rate limiting for API routes ───
  if (RATE_LIMITED_API_PREFIXES.some(p => pathname.startsWith(p))) {
    const now = Date.now()
    const key = `rl:${ip}`
    const entry = rateLimitStore.get(key)

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + 60_000 })
    } else {
      entry.count++
      if (entry.count > DEFAULT_RATE_LIMIT) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Max ${DEFAULT_RATE_LIMIT} requests per minute.`,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
              'X-RateLimit-Limit': String(DEFAULT_RATE_LIMIT),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|notification.mp3).*)',
  ],
}
