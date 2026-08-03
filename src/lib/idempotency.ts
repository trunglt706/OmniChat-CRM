import { getRedis } from './redis'

/**
 * Idempotency Key support for POST/PUT requests.
 *
 * Flow:
 * 1. Client sends Idempotency-Key header with a unique value.
 * 2. Server checks Redis for existing response.
 * 3. If found, returns cached response (status + headers + body).
 * 4. If not, processes request, caches response, returns it.
 *
 * Keys expire after 24 hours.
 */

const IDEMPOTENCY_HEADER = 'idempotency-key'
const IDEMPOTENCY_TTL = 24 * 3600 // 24 hours
const IDEMPOTENCY_KEY_PREFIX = 'idem:'

interface CachedResponse {
  status: number
  headers: Record<string, string>
  body: string
}

/**
 * Check if an idempotency key was already processed.
 * Returns the cached response if found, null otherwise.
 */
export async function getIdempotencyResult(
  key: string
): Promise<CachedResponse | null> {
  if (!key) return null
  const redis = getRedis()
  const cached = await redis.get(`${IDEMPOTENCY_KEY_PREFIX}${key}`)
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    return null
  }
}

/**
 * Store the response for an idempotency key.
 */
export async function setIdempotencyResult(
  key: string,
  status: number,
  headers: Headers,
  body: unknown
): Promise<void> {
  if (!key) return
  const redis = getRedis()
  const headerObj: Record<string, string> = {}
  headers.forEach((v, k) => { headerObj[k] = v })

  const cached: CachedResponse = {
    status,
    headers: headerObj,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }

  await redis.set(
    `${IDEMPOTENCY_KEY_PREFIX}${key}`,
    JSON.stringify(cached),
    IDEMPOTENCY_TTL
  )
}

/**
 * Extract idempotency key from request.
 */
export function extractIdempotencyKey(request: Request): string | null {
  return request.headers.get(IDEMPOTENCY_HEADER)
}

/**
 * Build a Response from a cached idempotency result.
 */
export function idempotencyResponse(cached: CachedResponse): Response {
  return new Response(cached.body, {
    status: cached.status,
    headers: cached.headers,
  })
}

export { IDEMPOTENCY_HEADER }