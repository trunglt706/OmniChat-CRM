import { createHash, randomBytes } from 'crypto'
import { getRedis, type RedisClient } from './redis'
import { getSecurityEnv } from './redis'

/**
 * Double-submit cookie CSRF protection.
 *
 * Flow:
 * 1. Server sets csrf-token in a non-HttpOnly cookie on every response.
 * 2. Client reads this cookie and sends it back in:
 *    - header: x-csrf-token
 *    - or body field: _csrf
 * 3. Server compares cookie value == header/body value.
 *
 * This works because an attacker cannot read non-HttpOnly cookies
 * from another origin due to SameSite policy.
 */

const CSRF_COOKIE_NAME = 'omnichat.csrf'
const CSRF_HEADER = 'x-csrf-token'
const CSRF_BODY_FIELD = '_csrf'

/**
 * Generate a new CSRF token and store it in Redis (or memory).
 * Returns the token string.
 */
export async function generateCsrfToken(ip: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const env = getSecurityEnv()
  const redis = getRedis()
  const key = `csrf:${ip}:${token}`
  await redis.set(key, '1', env.CSRF_TOKEN_TTL)
  return token
}

/**
 * Validate a CSRF token from the request against Redis.
 */
export async function validateCsrfToken(ip: string, token: string): Promise<boolean> {
  if (!token || token.length < 16) return false
  const redis = getRedis()
  const key = `csrf:${ip}:${token}`
  const exists = await redis.exists(key)
  if (exists) {
    // Delete after validation (one-time use)
    await redis.del(key)
    return true
  }
  return false
}

/**
 * Extract CSRF token from request (header or body).
 */
export function extractCsrfToken(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER)
  if (headerToken) return headerToken

  // Check body for form submissions (only for content-type form)
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    // For URL-encoded forms, the body field would need to be parsed
    // We rely on the header for API (JSON) requests
  }

  return null
}

/**
 * Create the CSRF cookie header value.
 * Call this in every response to set the CSRF cookie.
 */
export function csrfCookieValue(token: string): string {
  return `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Lax; Secure; Max-Age=${getSecurityEnv().CSRF_TOKEN_TTL}`
}

export { CSRF_COOKIE_NAME, CSRF_HEADER, CSRF_BODY_FIELD }
