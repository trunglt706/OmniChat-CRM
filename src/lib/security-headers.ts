/**
 * Security headers (CSP) builder.
 * Applied in proxy.ts for all responses.
 */

import { getSecurityEnv } from './redis'

export interface CspOptions {
  nonce?: string
  reportUri?: string
}

/**
 * Build Content-Security-Policy header value.
 * Designed for SPA with Next.js.
 */
export function buildCsp(options: CspOptions = {}): string {
  const env = getSecurityEnv()
  if (!env.CSP_ENABLED) return ''

  const { nonce, reportUri } = options
  const n = nonce ? ` 'nonce-${nonce}'` : ''
  const report = reportUri || env.CSP_REPORT_URI

  const directives = [
    // Default: only same-origin
    `default-src 'self'`,

    // Scripts: self + inline with nonce (for Next.js hydration)
    `script-src 'self'${n} 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net`,

    // Styles: self + inline (for Tailwind, shadcn) + Google Fonts stylesheet
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

    // Images: self + data: (for avatars, inline images) + any external
    `img-src 'self' data: blob: https: http:`,

    // Fonts: self + Google Fonts CDN
    `font-src 'self' data: https://fonts.gstatic.com`,

    // Connect (fetch/WebSocket/XHR): self + API domains
    `connect-src 'self' wss: ws: https://api.telegram.org https://openapi.zalo.me https://api.chatwork.com https://graph.facebook.com`,

    // Frames: none (no iframes)
    `frame-src 'none'`,

    // Objects: none (no plugins)
    `object-src 'none'`,

    // Base URI: self only
    `base-uri 'self'`,

    // Form action: self only
    `form-action 'self'`,

    // Block mixed content
    `block-all-mixed-content`,

    // Upgrade insecure requests
    `upgrade-insecure-requests`,
  ]

  if (report) {
    directives.push(`report-uri ${report}`)
  }

  return directives.join('; ')
}

/**
 * Build all security headers for a response.
 */
export function getSecurityHeaders(
  options: { nonce?: string; csrfToken?: string } = {}
): Record<string, string> {
  const env = getSecurityEnv()
  const headers: Record<string, string> = {}

  // 1. Content Security Policy
  const csp = buildCsp({ nonce: options.nonce })
  if (csp) {
    headers['Content-Security-Policy'] = csp
  }

  // 2. Prevent MIME type sniffing
  headers['X-Content-Type-Options'] = 'nosniff'

  // 3. Clickjacking protection
  headers['X-Frame-Options'] = 'DENY'

  // 4. XSS Protection (legacy, but still useful)
  headers['X-XSS-Protection'] = '1; mode=block'

  // 5. Referrer Policy
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

  // 6. Permissions Policy
  headers['Permissions-Policy'] = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
  ].join(', ')

  // 7. HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  return headers
}

/**
 * XSS-safe output encoding for HTML contexts.
 * React auto-escapes, but for string interpolation in dangerouslySetInnerHTML
 * or server-rendered content, use this.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Escape for HTML attribute context.
 */
export function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape for JavaScript string context (prevent injection via strings).
 */
export function escapeJs(str: string): string {
  return JSON.stringify(str)
}
