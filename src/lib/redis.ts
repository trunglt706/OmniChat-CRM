import Redis from 'ioredis'

/**
 * Redis singleton client.
 * Falls back to in-memory Map when REDIS_URL is not set (dev mode).
 * In production, always use a real Redis instance.
 */

let _redis: Redis | null = null
let _memoryStore = new Map<string, { value: string; expireAt: number }>()
let _memoryTimer: ReturnType<typeof setInterval> | null = null

// Cleanup expired memory entries every 60s
function startMemoryCleanup() {
  if (_memoryTimer) return
  _memoryTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of _memoryStore) {
      if (entry.expireAt > 0 && entry.expireAt < now) {
        _memoryStore.delete(key)
      }
    }
  }, 60_000)
}

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ex?: number): Promise<void>
  del(key: string): Promise<number>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  exists(key: string): Promise<number>
  keys(pattern: string): Promise<string[]>
  ping(): Promise<string>
  isMemory: boolean
}

/** In-memory fallback when Redis is not available */
class MemoryRedis implements RedisClient {
  isMemory = true

  async get(key: string): Promise<string | null> {
    const entry = _memoryStore.get(key)
    if (!entry) return null
    if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
      _memoryStore.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ex?: number): Promise<void> {
    _memoryStore.set(key, {
      value,
      expireAt: ex ? Date.now() + ex * 1000 : 0,
    })
  }

  async del(key: string): Promise<number> {
    return _memoryStore.delete(key) ? 1 : 0
  }

  async incr(key: string): Promise<number> {
    const entry = _memoryStore.get(key)
    const val = (entry && !(entry.expireAt > 0 && entry.expireAt < Date.now()))
      ? parseInt(entry.value, 10) || 0
      : 0
    const newVal = val + 1
    _memoryStore.set(key, { value: String(newVal), expireAt: entry?.expireAt || 0 })
    return newVal
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = _memoryStore.get(key)
    if (!entry) return 0
    entry.expireAt = Date.now() + seconds * 1000
    return 1
  }

  async exists(key: string): Promise<number> {
    const entry = _memoryStore.get(key)
    if (!entry) return 0
    if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
      _memoryStore.delete(key)
      return 0
    }
    return 1
  }

  async keys(pattern: string): Promise<string[]> {
    if (pattern === '*') return [..._memoryStore.keys()]
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return [..._memoryStore.keys()].filter(k => regex.test(k))
  }

  async ping(): Promise<string> {
    return 'PONG'
  }
}

/**
 * Get the Redis client (singleton).
 * If REDIS_URL is not set, returns an in-memory fallback.
 */
export function getRedis(): RedisClient {
  if (_redis) return _redis

  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    _redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null // stop retrying
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
    })

    _redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })

    // Wrap Redis to match RedisClient interface
    const wrapped: RedisClient = {
      isMemory: false,
      get: (key) => _redis!.get(key),
      set: (key, value, ex) => {
        if (ex) return _redis!.set(key, value, 'EX', ex).then(() => {})
        return _redis!.set(key, value).then(() => {})
      },
      del: (key) => _redis!.del(key),
      incr: (key) => _redis!.incr(key),
      expire: (key, seconds) => _redis!.expire(key, seconds),
      exists: (key) => _redis!.exists(key),
      keys: (pattern) => _redis!.keys(pattern),
      ping: () => _redis!.ping(),
    }

    return wrapped
  }

  // No Redis URL — use in-memory fallback
  startMemoryCleanup()
  return new MemoryRedis()
}

/**
 * Security configuration from environment variables.
 * All values have sensible defaults for development.
 */
export interface SecurityEnv {
  // Auth
  NEXTAUTH_SECRET: string
  SESSION_MAX_AGE: number      // seconds

  // CSRF
  CSRF_ENABLED: boolean
  CSRF_TOKEN_TTL: number       // seconds

  // Rate Limiting
  RATE_LIMIT_ENABLED: boolean
  RATE_LIMIT_PER_MINUTE: number
  RATE_LIMIT_BURST: number
  RATE_LIMIT_WINDOW: number    // seconds

  // Business Rate Limit
  BUSINESS_RATE_LIMIT_ENABLED: boolean
  BUSINESS_RATE_LIMIT_MESSAGES: number  // per conversation per hour
  BUSINESS_RATE_LIMIT_BOT: number      // bot requests per minute

  // Webhook
  WEBHOOK_SECRET: string
  WEBHOOK_SIGNATURE_HEADER: string
  WEBHOOK_TIMESTAMP_TOLERANCE: number  // seconds

  // Upload
  UPLOAD_MAX_SIZE: number       // bytes
  UPLOAD_ALLOWED_MIME: string[]
  UPLOAD_MAX_FILES: number

  // CSP
  CSP_ENABLED: boolean
  CSP_REPORT_URI: string

  // Redis
  REDIS_URL: string | undefined

  // Tenant
  TENANT_MODE: boolean
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key]
  if (val === undefined || val === '') return fallback
  return val === 'true' || val === '1'
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key]
  if (!val) return fallback
  const n = parseInt(val, 10)
  return isNaN(n) ? fallback : n
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback
}

function envStrArray(key: string, fallback: string[]): string[] {
  const val = process.env[key]
  if (!val) return fallback
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

/** Load all security-relevant env vars once */
export function loadSecurityEnv(): SecurityEnv {
  return {
    NEXTAUTH_SECRET: envStr('NEXTAUTH_SECRET', 'omnichat-dev-secret-change-in-production'),
    SESSION_MAX_AGE: envInt('SESSION_MAX_AGE', 30 * 24 * 60 * 60), // 30 days

    CSRF_ENABLED: envBool('CSRF_ENABLED', true),
    CSRF_TOKEN_TTL: envInt('CSRF_TOKEN_TTL', 3600), // 1 hour

    RATE_LIMIT_ENABLED: envBool('RATE_LIMIT_ENABLED', true),
    RATE_LIMIT_PER_MINUTE: envInt('RATE_LIMIT_PER_MINUTE', 60),
    RATE_LIMIT_BURST: envInt('RATE_LIMIT_BURST', 10),
    RATE_LIMIT_WINDOW: envInt('RATE_LIMIT_WINDOW', 60),

    BUSINESS_RATE_LIMIT_ENABLED: envBool('BUSINESS_RATE_LIMIT_ENABLED', true),
    BUSINESS_RATE_LIMIT_MESSAGES: envInt('BUSINESS_RATE_LIMIT_MESSAGES', 100),
    BUSINESS_RATE_LIMIT_BOT: envInt('BUSINESS_RATE_LIMIT_BOT', 20),

    WEBHOOK_SECRET: envStr('WEBHOOK_SECRET', ''),
    WEBHOOK_SIGNATURE_HEADER: envStr('WEBHOOK_SIGNATURE_HEADER', 'x-webhook-signature'),
    WEBHOOK_TIMESTAMP_TOLERANCE: envInt('WEBHOOK_TIMESTAMP_TOLERANCE', 300), // 5 min

    UPLOAD_MAX_SIZE: envInt('UPLOAD_MAX_SIZE', 10 * 1024 * 1024), // 10MB
    UPLOAD_ALLOWED_MIME: envStrArray('UPLOAD_ALLOWED_MIME', [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm',
    ]),
    UPLOAD_MAX_FILES: envInt('UPLOAD_MAX_FILES', 5),

    CSP_ENABLED: envBool('CSP_ENABLED', true),
    CSP_REPORT_URI: envStr('CSP_REPORT_URI', ''),

    REDIS_URL: process.env.REDIS_URL,
    TENANT_MODE: envBool('TENANT_MODE', false),
  }
}

// Singleton env config
let _securityEnv: SecurityEnv | null = null
export function getSecurityEnv(): SecurityEnv {
  if (!_securityEnv) _securityEnv = loadSecurityEnv()
  return _securityEnv
}
