import { CSRF_HEADER } from '@/lib/csrf-constants'

/**
 * Secure API client for client-side fetch calls.
 * Automatically reads CSRF token from cookie and sends it as header.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api-client'
 *   const data = await apiFetch('/api/conversations', { method: 'GET' })
 *   const created = await apiFetch('/api/conversations', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... }),
 *   })
 */

/**
 * Read CSRF token from cookie.
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)omnichat\.csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Generate a unique idempotency key.
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Check if an error response is a CSRF failure.
 */
function isCsrfError(response: Response, errorData: any): boolean {
  return response.status === 403 && (
    (errorData as any)?.message?.includes?.('CSRF') ||
    (errorData as any)?.error?.includes?.('CSRF') ||
    response.headers.get('X-CSRF-Error') === 'invalid'
  )
}

/**
 * Fetch a fresh CSRF token by making a lightweight GET request.
 * The proxy sets a new CSRF cookie on every authenticated response.
 */
async function refreshCsrfToken(): Promise<boolean> {
  try {
    // Any authenticated GET will refresh the CSRF cookie via the proxy
    const res = await fetch('/api/agents/me/stats', { method: 'GET', cache: 'no-store' })
    return res.ok || res.status === 401
  } catch {
    return false
  }
}

/**
 * Internal fetch implementation with optional CSRF retry.
 */
async function doFetch<T = any>(
  url: string,
  options: RequestInit & { idempotencyKey?: string },
  isRetry: boolean
): Promise<T> {
  const { idempotencyKey, headers: extraHeaders, ...rest } = options
  const method = (rest.method || 'GET').toUpperCase()

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  }

  // Auto Content-Type for JSON bodies
  if (rest.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // CSRF token for mutating requests
  const isMutating = method !== 'GET' && method !== 'HEAD'
  if (isMutating) {
    const csrf = getCsrfToken()
    if (csrf) {
      headers[CSRF_HEADER] = csrf
    }
  }

  // Idempotency key
  if (idempotencyKey && isMutating) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch(url, { ...rest, headers })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `HTTP ${response.status}`,
    }))

    // Handle CSRF error — retry once with a fresh token
    if (!isRetry && isCsrfError(response, errorData)) {
      const refreshed = await refreshCsrfToken()
      if (refreshed) {
        return doFetch<T>(url, options, true)
      }
      // If refresh also fails, fall through to throw
    }

    throw Object.assign(new Error((errorData as any).error || `HTTP ${response.status}`), {
      status: response.status,
      data: errorData,
    })
  }

  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

/**
 * Enhanced fetch with automatic:
 * - CSRF token injection
 * - CSRF retry (one automatic retry on stale token)
 * - Content-Type header
 * - Error handling
 * - Idempotency key generation
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  return doFetch<T>(url, options, false)
}

/**
 * Convenience POST helper.
 */
export async function apiPost<T = any>(url: string, body: unknown, opts?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...opts,
  })
}

/**
 * Convenience PUT helper.
 */
export async function apiPut<T = any>(url: string, body: unknown, opts?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...opts,
  })
}
