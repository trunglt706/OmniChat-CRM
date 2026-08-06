import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ─── Security imports ───
import { getSecurityEnv } from '@/lib/redis'
import { checkApiRateLimit, rateLimitResponse, checkBotRateLimit, checkAutoBlacklist } from '@/lib/rate-limit'
import { generateCsrfToken, csrfCookieValue, validateCsrfToken, CSRF_HEADER } from '@/lib/csrf'
import { extractIdempotencyKey, getIdempotencyResult, idempotencyResponse } from '@/lib/idempotency'
import { getSecurityHeaders } from '@/lib/security-headers'
import { isBlacklisted } from '@/lib/security'
import { logBlockedRequest } from '@/lib/api-logger'

// ─── Route configuration ───
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhook', '/api/ws/test', '/api/realtime/test']
const CSRF_EXEMPT_PATHS = ['/api/auth', '/api/webhook', '/api/ws/test', '/api/realtime/test'] // Auth, webhooks & tests don't need CSRF
const IDEMPOTENCY_METHODS = ['POST', 'PUT', 'PATCH']

// API prefixes that need rate limiting
const RATE_LIMITED_API_PREFIXES = [
  '/api/conversations', '/api/customers', '/api/dashboard',
  '/api/reports', '/api/bot', '/api/simulation', '/api/agents',
  '/api/tags', '/api/automation', '/api/channels', '/api/backup',
  '/api/security', '/api/monitoring',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const env = getSecurityEnv()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'

  // ─── 0. Blacklist check (before everything) ───
  if (isBlacklisted(ip)) {
    logBlockedRequest({ method, path: pathname, ip, reason: 'blacklisted', status: 403 })
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden', message: 'IP đã bị chặn' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ─── 1. Webhook routes: no auth, no CSRF, only signature verification ───
  if (pathname.startsWith('/api/webhook')) {
    // Webhook signature verification is done in the route handler itself
    // using verifyWebhookByChannel(). The proxy just passes through.
    return NextResponse.next()
  }

  // ─── 2. Auth guard ───
  const isPublic =
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')

  let userId: string | undefined
  let tenantId: string | undefined

  if (!isPublic) {
    try {
      const token = await getToken({
        req: request,
        secret: env.NEXTAUTH_SECRET,
        cookieName: 'next-auth.session-token',
      })
      if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
      userId = token.sub as string
      tenantId = token.tenantId as string | undefined
    } catch {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─── 3. Rate limiting for API routes ───
  if (RATE_LIMITED_API_PREFIXES.some(p => pathname.startsWith(p))) {
    const result = await checkApiRateLimit(ip, userId, tenantId)
    if (!result.allowed) {
      logBlockedRequest({ method, path: pathname, ip, userId, reason: 'rate_limited', status: 429 })
      // Auto-blacklist IPs that repeatedly violate rate limits
      await checkAutoBlacklist(ip)
      return rateLimitResponse(result)
    }

    // Bot-specific rate limiting
    if (pathname.startsWith('/api/bot')) {
      const botResult = await checkBotRateLimit(userId || ip)
      if (!botResult.allowed) {
        return rateLimitResponse(botResult)
      }
    }
  }

  // ─── 4. CSRF protection for mutating requests ───
  const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
  const needsCsrf =
    isMutating &&
    env.CSRF_ENABLED &&
    !CSRF_EXEMPT_PATHS.some(p => pathname.startsWith(p))

  if (needsCsrf && userId) {
    const csrfToken = request.headers.get(CSRF_HEADER)
    if (!csrfToken || !(await validateCsrfToken(ip, csrfToken))) {
      logBlockedRequest({ method, path: pathname, ip, userId, reason: 'csrf_failed', status: 403 })
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden', message: 'CSRF token không hợp lệ hoặc đã hết hạn' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Error': 'invalid',
          },
        }
      )
    }
  }

  // ─── 5. Idempotency check (POST/PUT/PATCH) ───
  if (IDEMPOTENCY_METHODS.includes(method) && userId) {
    const idemKey = extractIdempotencyKey(request)
    if (idemKey) {
      const cached = await getIdempotencyResult(idemKey)
      if (cached) {
        // Return cached response
        return idempotencyResponse(cached)
      }
    }
  }

  // ─── 6. Build response with security headers ───
  const response = NextResponse.next()

  // Add security headers
  const secHeaders = getSecurityHeaders()
  for (const [key, value] of Object.entries(secHeaders)) {
    response.headers.set(key, value)
  }

  // Set CSRF cookie on every authenticated response
  // (token is one-time-use, so client needs a fresh one after each request)
  if (userId && env.CSRF_ENABLED) {
    const csrfToken = await generateCsrfToken(ip)
    response.headers.append('Set-Cookie', csrfCookieValue(csrfToken))
  }

  // Add rate limit info headers
  if (RATE_LIMITED_API_PREFIXES.some(p => pathname.startsWith(p))) {
    response.headers.set('X-RateLimit-Policy', 'ip+user+tenant')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt|notification.mp3).*)',
  ],
}
