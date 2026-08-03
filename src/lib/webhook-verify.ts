import { createHmac } from 'crypto'
import { getSecurityEnv } from './redis'

/**
 * Webhook signature verification.
 *
 * Supported algorithms:
 * - HMAC-SHA256 (Facebook, Zalo, Telegram, Chatwork)
 * - Custom: timestamp + signature (X-Webhook-Timestamp + X-Webhook-Signature)
 *
 * Each platform has its own verification method.
 */

export interface WebhookVerifyResult {
  valid: boolean
  message: string
}

// ─── Generic HMAC-SHA256 ────────────────────────────────────────────────

/**
 * Verify HMAC-SHA256 signature.
 * @param payload - Raw request body string
 * @param signature - Signature from header
 * @param secret - Shared secret
 */
export function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string
): WebhookVerifyResult {
  if (!secret) {
    return { valid: false, message: 'Webhook secret chưa được cấu hình' }
  }

  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const provided = signature.replace(/^sha256=/i, '')

  // Timing-safe comparison
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(provided, 'hex')
  if (a.length !== b.length) {
    return { valid: false, message: 'Signature length không khớp' }
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  if (result !== 0) {
    return { valid: false, message: 'Signature không hợp lệ' }
  }

  return { valid: true, message: 'Signature hợp lệ' }
}

// ─── Facebook ──────────────────────────────────────────────────────────

export function verifyFacebookWebhook(
  payload: string,
  signatureHeader: string | null,
  appSecret: string
): WebhookVerifyResult {
  if (!signatureHeader) {
    return { valid: false, message: 'Thiếu X-Hub-Signature-256 header' }
  }
  return verifyHmacSha256(payload, signatureHeader, appSecret)
}

// ─── Zalo ──────────────────────────────────────────────────────────────

export function verifyZaloWebhook(
  payload: string,
  signatureHeader: string | null,
  appSecret: string
): WebhookVerifyResult {
  if (!signatureHeader) {
    return { valid: false, message: 'Thiếu X-Zalo-Signature header' }
  }
  return verifyHmacSha256(payload, signatureHeader, appSecret)
}

// ─── Telegram ──────────────────────────────────────────────────────────

export function verifyTelegramWebhook(
  payload: string,
  secretToken?: string
): WebhookVerifyResult {
  if (!secretToken) {
    return { valid: false, message: 'Thiếu secret_token cấu hình' }
  }
  try {
    const data = JSON.parse(payload)
    // Telegram sends the secret_token in the body for webhook setup verification
    // For regular updates, verify via getUpdates or trust the webhook URL secrecy
    if (data.secret_token && data.secret_token !== secretToken) {
      return { valid: false, message: 'Telegram secret_token không khớp' }
    }
    return { valid: true, message: 'OK' }
  } catch {
    return { valid: false, message: 'Payload không phải JSON hợp lệ' }
  }
}

// ─── Chatwork ─────────────────────────────────────────────────────────

export function verifyChatworkWebhook(
  _payload: string,
  signatureHeader: string | null,
  webhookToken: string
): WebhookVerifyResult {
  if (!webhookToken) {
    return { valid: false, message: 'Thiếu Webhook Token cấu hình' }
  }
  if (!signatureHeader) {
    return { valid: false, message: 'Thiếu X-ChatWorkWebhookSignature header' }
  }
  return verifyHmacSha256(_payload, signatureHeader, webhookToken)
}

// ─── Generic timestamp+signature (Website widget, Email) ──────────────

/**
 * Verify timestamp + HMAC signature pattern.
 * Expects headers:
 *   X-Webhook-Timestamp: unix timestamp
 *   X-Webhook-Signature: HMAC-SHA256 of timestamp + payload
 */
export function verifyTimestampedWebhook(
  payload: string,
  timestampStr: string | null,
  signature: string | null,
  secret: string
): WebhookVerifyResult {
  const env = getSecurityEnv()

  if (!timestampStr || !signature) {
    return { valid: false, message: 'Thiếu timestamp hoặc signature header' }
  }

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) {
    return { valid: false, message: 'Timestamp không hợp lệ' }
  }

  // Check timestamp tolerance (replay attack prevention)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > env.WEBHOOK_TIMESTAMP_TOLERANCE) {
    return { valid: false, message: `Timestamp quá cũ/mới. Tolerence: ${env.WEBHOOK_TIMESTAMP_TOLERANCE}s` }
  }

  const signedPayload = `${timestamp}.${payload}`
  return verifyHmacSha256(signedPayload, signature, secret)
}

// ─── Channel-specific dispatcher ───────────────────────────────────────

/**
 * Verify webhook for a specific channel.
 * Reads the channel's config from DB to get the secret/key.
 */
export async function verifyWebhookByChannel(
  channel: string,
  payload: string,
  headers: Headers
): Promise<WebhookVerifyResult> {
  // Dynamic import to avoid circular dependency
  const { db } = await import('./db')
  const config = await db.channelConfig.findUnique({ where: { channel } })
  const cfg: Record<string, string> = config ? JSON.parse(config.config) : {}

  switch (channel) {
    case 'facebook_messenger':
    case 'facebook_comment':
      return verifyFacebookWebhook(
        payload,
        headers.get('x-hub-signature-256'),
        cfg.appSecret || ''
      )

    case 'zalo':
      return verifyZaloWebhook(
        payload,
        headers.get('x-zalo-signature'),
        cfg.appSecret || ''
      )

    case 'telegram':
      return verifyTelegramWebhook(
        payload,
        cfg.webhookSecret || cfg.verifyToken
      )

    case 'chatwork':
      return verifyChatworkWebhook(
        payload,
        headers.get('x-chatworkwebhooksignature'),
        cfg.apiToken || ''
      )

    case 'website': {
      const secret = cfg.webhookSecret || getSecurityEnv().WEBHOOK_SECRET
      return verifyTimestampedWebhook(
        payload,
        headers.get('x-webhook-timestamp'),
        headers.get(getSecurityEnv().WEBHOOK_SIGNATURE_HEADER),
        secret
      )
    }

    default:
      return { valid: false, message: `Kênh '${channel}' không hỗ trợ webhook verification` }
  }
}
