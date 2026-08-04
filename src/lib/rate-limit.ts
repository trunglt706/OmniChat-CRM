import { getRedis, getSecurityEnv } from './redis'
import { addToBlacklist } from './security'

/**
 * Rate limiter using Redis (or in-memory fallback).
 * Supports multiple dimensions: IP, User, Tenant, Business.
 *
 * Sliding window counter algorithm via Redis INCR + EXPIRE.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number  // unix ms
}

/**
 * Generic rate limit check.
 * @param key - Redis key for this rate limit bucket
 * @param limit - Max requests in window
 * @param windowSeconds - Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis()
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `${key}:${now}`

  const count = await redis.incr(windowKey)

  // Set expiry on first increment
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds + 1)
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt: (now + 1) * 1000,
  }
}

/**
 * Check rate limit for API requests (IP + User + Tenant).
 * Uses the most restrictive limit among all dimensions.
 */
export async function checkApiRateLimit(
  ip: string,
  userId?: string,
  tenantId?: string
): Promise<RateLimitResult> {
  const env = getSecurityEnv()
  if (!env.RATE_LIMIT_ENABLED) {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: 0 }
  }

  const window = env.RATE_LIMIT_WINDOW
  const limitPerMin = env.RATE_LIMIT_PER_MINUTE
  const burst = env.RATE_LIMIT_BURST

  // Check all dimensions in parallel
  const checks: Promise<RateLimitResult>[] = [
    // IP-based
    checkRateLimit(`rl:ip:${ip}`, limitPerMin, window),
  ]

  if (userId) {
    // User-based (slightly higher than IP)
    checks.push(checkRateLimit(`rl:user:${userId}`, limitPerMin * 2, window))
  }

  if (tenantId && env.TENANT_MODE) {
    // Tenant-based (much higher)
    checks.push(checkRateLimit(`rl:tenant:${tenantId}`, limitPerMin * 10, window))
  }

  // Burst check (per-second limit)
  checks.push(checkRateLimit(`rl:burst:${ip}`, burst, 1))

  const results = await Promise.all(checks)

  // Return the most restrictive result
  const mostRestrictive = results.reduce((worst, r) => {
    if (!r.allowed) return r
    if (r.remaining < worst.remaining) return r
    return worst
  })

  return mostRestrictive
}

/**
 * Business rate limit: limit messages per conversation per hour.
 */
export async function checkBusinessRateLimit(
  conversationId: string,
  userId: string
): Promise<RateLimitResult> {
  const env = getSecurityEnv()
  if (!env.BUSINESS_RATE_LIMIT_ENABLED) {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: 0 }
  }

  return checkRateLimit(
    `biz:msg:${conversationId}:${userId}`,
    env.BUSINESS_RATE_LIMIT_MESSAGES,
    3600 // 1 hour
  )
}

/**
 * Bot rate limit: limit bot/AI requests per user per minute.
 */
export async function checkBotRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const env = getSecurityEnv()
  if (!env.BUSINESS_RATE_LIMIT_ENABLED) {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: 0 }
  }

  return checkRateLimit(
    `biz:bot:${userId}`,
    env.BUSINESS_RATE_LIMIT_BOT,
    60 // 1 minute
  )
}

/**
 * Create a 429 Rate Limit response.
 */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    }
  )
}

/**
 * Check if an IP should be auto-blacklisted due to repeated rate limit violations.
 * Called after rate limit is exceeded. If IP has been rate-limited > 5 times in 10 minutes,
 * auto-add to blacklist to protect the system.
 */
export async function checkAutoBlacklist(ip: string): Promise<boolean> {
  try {
    const redis = getRedis()
    const key = `rl:violations:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 600) // 10-minute window

    // Auto-blacklist after 5 rate limit violations in 10 minutes
    if (count >= 5) {
      await addToBlacklist({
        type: 'ip',
        value: ip,
        reason: `Auto-blacklisted: ${count} rate limit violations in 10 minutes`,
        addedAt: new Date().toISOString(),
        addedBy: 'system:auto-blacklist',
      })
      return true // now blacklisted
    }
    return false
  } catch {
    return false
  }
}
