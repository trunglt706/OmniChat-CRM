import { CSRF_HEADER } from '@/lib/csrf'

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
 * Enhanced fetch with automatic:
 * - CSRF token injection
 * - Content-Type header
 * - Error handling
 * - Idempotency key generation
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit & { idempotencyKey?: string } = {}
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

    // Handle CSRF error — token may be stale, refresh page
    if (response.status === 403 && (errorData as any).error?.includes?.('CSRF')) {
      // Force refresh to get new CSRF token
      window.location.reload()
      throw new Error('CSRF token expired, refreshing...')
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
 * convenience POST helper.
 */
export async function apiPost<T = any>(url: string, body: unknown, opts?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...opts,
  })
}

/**
 * convenience PUT helper.
 */
export async function apiPut<T = any>(url: string, body: unknown, opts?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...opts,
  })
}
