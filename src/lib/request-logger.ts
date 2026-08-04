/**
 * Request Logger — structured logging for security monitoring & performance.
 * 
 * Uses only basic Redis operations (incr/set/get/del/expire/keys)
 * that are available on both real Redis and the in-memory fallback.
 * 
 * Memory ring buffer as fallback when Redis is unavailable.
 */

import { getRedis, getSecurityEnv } from './redis'

// ─── Types ───
export interface RequestLog {
  id: string
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  ip: string
  userId?: string
  tenantId?: string
  userAgent?: string
  rateLimited?: boolean
  csrfError?: boolean
}

export interface LogSummary {
  totalRequests: number
  errorRate: number
  avgResponseMs: number
  p95ResponseMs: number
  topPaths: { path: string; count: number; avgMs: number }[]
  suspiciousIps: { ip: string; count: number; errors: number }[]
}

// ─── In-memory ring buffer (fallback) ───
const MEMORY_BUFFER_SIZE = 500
const memoryBuffer: RequestLog[] = []
let memoryBufferIndex = 0

// ─── Log a request (fire-and-forget) ───
export async function logRequest(log: RequestLog): Promise<void> {
  // Always write to memory buffer
  memoryBuffer[memoryBufferIndex % MEMORY_BUFFER_SIZE] = log
  memoryBufferIndex++

  try {
    const redis = getRedis()
    const now = Math.floor(Date.now() / 1000)
    const hourKey = new Date().toISOString().slice(0, 13)

    // Count requests per hour
    await redis.incr(`log:total:${hourKey}`)
    await redis.expire(`log:total:${hourKey}`, 86400)

    // Count errors per hour
    if (log.status >= 400) {
      await redis.incr(`log:errors:${hourKey}`)
      await redis.expire(`log:errors:${hourKey}`, 86400)
    }

    // Track per-IP request count for anomaly detection (1-min window)
    const minuteBucket = Math.floor(now / 60)
    const ipKey = `log:ip:${log.ip}:${minuteBucket}`
    const ipCount = await redis.incr(ipKey)
    if (ipCount === 1) await redis.expire(ipKey, 120)

    // Alert if IP exceeds 3x rate limit in 1 minute
    const env = getSecurityEnv()
    const ALERT_THRESHOLD = env.RATE_LIMIT_PER_MINUTE * 3
    if (ipCount === ALERT_THRESHOLD) {
      const alertKey = `log:alert:${log.ip}:${minuteBucket}`
      await redis.set(alertKey, JSON.stringify({
        type: 'high_frequency_ip',
        ip: log.ip,
        count: ipCount,
        timestamp: new Date().toISOString(),
        userId: log.userId,
      }), 3600)
    }

    // Store the latest log entry per path+minute for analytics
    const pathNorm = log.path.replace(/\/([0-9a-f-]{20,})/g, '/:id')
    const pathCountKey = `log:path:${hourKey}:${pathNorm}`
    await redis.incr(pathCountKey)
    await redis.expire(pathCountKey, 86400)

    // Track total duration per path for avg calculation
    const pathDurKey = `log:pathdur:${hourKey}:${pathNorm}`
    const existing = await redis.get(pathDurKey)
    const prevDur = existing ? parseInt(existing, 10) : 0
    await redis.set(pathDurKey, String(prevDur + log.durationMs), 86400)
  } catch {
    // Redis unavailable — memory buffer is our fallback
  }
}

// ─── Get recent logs from memory buffer ───
export function getRecentLogs(limit: number = 100): RequestLog[] {
  return [...memoryBuffer].reverse().slice(0, limit)
}

// ─── Get log summary / analytics ───
export async function getLogSummary(minutes: number = 60): Promise<LogSummary> {
  const logs = getRecentLogs(500)
  
  if (logs.length === 0) {
    return {
      totalRequests: 0, errorRate: 0, avgResponseMs: 0,
      p95ResponseMs: 0, topPaths: [], suspiciousIps: [],
    }
  }

  const errorCount = logs.filter(l => l.status >= 400).length
  const durations = logs.map(l => l.durationMs).sort((a, b) => a - b)
  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
  const p95Ms = durations[Math.floor(durations.length * 0.95)] || 0

  // Top paths by request count
  const pathMap = new Map<string, { count: number; totalMs: number }>()
  for (const l of logs) {
    const normalized = l.path.replace(/\/([0-9a-f-]{20,})/g, '/:id')
    const existing = pathMap.get(normalized) || { count: 0, totalMs: 0 }
    existing.count++
    existing.totalMs += l.durationMs
    pathMap.set(normalized, existing)
  }
  const topPaths = [...pathMap.entries()]
    .map(([path, data]) => ({ path, count: data.count, avgMs: Math.round(data.totalMs / data.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Suspicious IPs (high request count + high error rate)
  const ipMap = new Map<string, { count: number; errors: number }>()
  for (const l of logs) {
    const existing = ipMap.get(l.ip) || { count: 0, errors: 0 }
    existing.count++
    if (l.status >= 400) existing.errors++
    ipMap.set(l.ip, existing)
  }
  const suspiciousIps = [...ipMap.entries()]
    .filter(([, data]) => data.count > 50 && data.errors / data.count > 0.3)
    .map(([ip, data]) => ({ ip, count: data.count, errors: data.errors }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalRequests: logs.length,
    errorRate: Math.round((errorCount / logs.length) * 100) / 100,
    avgResponseMs: Math.round(avgMs),
    p95ResponseMs: Math.round(p95Ms),
    topPaths,
    suspiciousIps,
  }
}

// ─── Get alerts from Redis keys ───
export async function getAlerts(limit: number = 50): Promise<any[]> {
  try {
    const redis = getRedis()
    const alertKeys = await redis.keys('log:alert:*')
    const alerts: any[] = []
    for (const key of alertKeys.slice(0, limit)) {
      const data = await redis.get(key)
      if (data) {
        try { alerts.push(JSON.parse(data)) } catch {}
      }
    }
    return alerts.sort((a, b) => b.timestamp?.localeCompare(a.timestamp)).slice(0, limit)
  } catch {
    return []
  }
}

// ─── Brute force detection for login attempts ───
export async function checkBruteForce(ip: string, email?: string): Promise<{
  blocked: boolean
  attempts: number
  remainingAttempts: number
}> {
  const MAX_ATTEMPTS = 10
  const WINDOW_SECONDS = 900 // 15 minutes

  try {
    const redis = getRedis()
    const now = Math.floor(Date.now() / 1000)
    const bucket = now - (now % WINDOW_SECONDS)

    // Check IP-based attempts
    const ipKey = `bruteforce:ip:${ip}:${bucket}`
    const ipAttempts = await redis.incr(ipKey)
    if (ipAttempts === 1) await redis.expire(ipKey, WINDOW_SECONDS + 1)

    // Check email-based attempts (if provided)
    let emailAttempts = 0
    if (email) {
      const emailKey = `bruteforce:email:${email}:${bucket}`
      emailAttempts = await redis.incr(emailKey)
      if (emailAttempts === 1) await redis.expire(emailKey, WINDOW_SECONDS + 1)
    }

    const maxAttempts = Math.max(ipAttempts, emailAttempts)
    const blocked = maxAttempts > MAX_ATTEMPTS

    return {
      blocked,
      attempts: maxAttempts,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - maxAttempts),
    }
  } catch {
    return { blocked: false, attempts: 0, remainingAttempts: MAX_ATTEMPTS }
  }
}

// ─── Get memory buffer for debugging ───
export function getMemoryBufferLogs(): RequestLog[] {
  return [...memoryBuffer].reverse()
}
