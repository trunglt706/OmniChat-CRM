/**
 * Helper functions for API routes to use security middleware features
 * that run AFTER the proxy.ts middleware.
 *
 * These are used inside API route handlers for:
 * - Storing idempotency results after successful processing
 * - Checking business rate limits
 * - Getting the authenticated user
 */

import { setIdempotencyResult, extractIdempotencyKey } from './idempotency'
import { checkBusinessRateLimit, rateLimitResponse } from './rate-limit'
import { getAuthUser } from './session'
import type { NextRequest } from 'next/server'

/**
 * Wrap a POST/PUT handler with idempotency support.
 * If the request has a valid idempotency key with a cached result,
 * returns the cached response immediately.
 * Otherwise, calls the handler and caches the result.
 */
export async function withIdempotency(
  request: NextRequest,
  handler: () => Promise<Response>
): Promise<Response> {
  const idemKey = extractIdempotencyKey(request)
  if (!idemKey) {
    return handler()
  }

  // Check cache (already done in proxy.ts, but double-check here)
  const { getIdempotencyResult } = await import('./idempotency')
  const cached = await getIdempotencyResult(idemKey)
  if (cached) {
    const { idempotencyResponse } = await import('./idempotency')
    return idempotencyResponse(cached)
  }

  // Execute handler
  const response = await handler()

  // Cache successful responses
  if (response.status >= 200 && response.status < 300) {
    const body = await response.clone().text()
    await setIdempotencyResult(idemKey, response.status, response.headers, body)
  }

  return response
}

/**
 * Check business rate limit for sending a message.
 * Call this before processing a message send.
 * Returns null if allowed, or a 429 Response if rate limited.
 */
export async function withBusinessRateLimit(
  request: NextRequest,
  conversationId: string
): Promise<Response | null> {
  const user = await getAuthUser(request)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const result = await checkBusinessRateLimit(conversationId, user.id)
  if (!result.allowed) {
    return rateLimitResponse(result)
  }

  return null // allowed
}
