/**
 * API Route Logger wrapper.
 * 
 * Usage in any route handler:
 *   import { withLogging } from '@/lib/api-logger'
 *   export const GET = withLogging(async (req, { userId, ip }) => { ... })
 * 
 * Automatically logs: method, path, status, duration, ip, userId.
 * Non-invasive — errors in logging never affect the actual handler.
 */

import type { NextRequest, NextResponse } from 'next/server'
import { logRequest } from './request-logger'

type HandlerContext = {
  userId?: string
  ip: string
  tenantId?: string
}

type RouteHandler<T = any> = (
  request: NextRequest,
  ctx: HandlerContext
) => Promise<T>

/**
 * Wrap a route handler with request/response logging.
 */
export function withLogging(handler: RouteHandler<NextResponse>) {
  return async (request: NextRequest, context?: Record<string, any>): Promise<NextResponse> => {
    const startTime = Date.now()
    const { pathname } = request.nextUrl
    const method = request.method
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    try {
      const response = await handler(request, {
        userId: context?.userId,
        ip,
        tenantId: context?.tenantId,
      })

      // Log successful request (fire-and-forget)
      const duration = Date.now() - startTime
      logRequest({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        method,
        path: pathname,
        status: response.status,
        durationMs: duration,
        ip,
        userId: context?.userId,
        tenantId: context?.tenantId,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(() => {})

      return response
    } catch (error) {
      // Log error response
      const duration = Date.now() - startTime
      logRequest({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        method,
        path: pathname,
        status: 500,
        durationMs: duration,
        ip,
        userId: context?.userId,
        tenantId: context?.tenantId,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(() => {})

      throw error // Re-throw so Next.js handles it
    }
  }
}

/**
 * Log a blocked request (rate-limited, CSRF failed, blacklisted).
 * Call from middleware before returning the error response.
 */
export function logBlockedRequest(params: {
  method: string
  path: string
  ip: string
  userId?: string
  reason: 'rate_limited' | 'csrf_failed' | 'blacklisted' | 'brute_force'
  status: number
}): void {
  logRequest({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    method: params.method,
    path: params.path,
    status: params.status,
    durationMs: 0,
    ip: params.ip,
    userId: params.userId,
    rateLimited: params.reason === 'rate_limited',
    csrfError: params.reason === 'csrf_failed',
  }).catch(() => {})
}
