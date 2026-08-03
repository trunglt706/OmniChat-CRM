/**
 * Website Widget Channel Adapter
 * 
 * Không gọi API bên ngoài — chỉ validate cấu hình.
 */

import {
  BaseChannelAdapter,
  type ChannelType,
  type ChannelMeta,
  type TestResult,
  type WebhookVerifyResult,
  type WebhookHandleResult,
} from '../types'
import { getSecurityEnv } from '@/lib/redis'
import { verifyHmacSha256 } from '@/lib/webhook-verify'

export class WebsiteAdapter extends BaseChannelAdapter {
  readonly channelType: ChannelType = 'website'

  readonly meta: ChannelMeta = {
    order: 6,
    label: 'Website',
    color: '#10b981',
    iconName: 'Globe',
    skipConfigCheck: ['widgetId'],
    fields: [
      { key: 'widgetId', label: 'Widget ID', type: 'text', placeholder: 'Tự động tạo khi lưu' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/website' },
      { key: 'allowedDomains', label: 'Allowed Domains', type: 'text', placeholder: 'your-domain.com, app.your-domain.com' },
    ],
  }

  /** Tự sinh widgetId nếu chưa có */
  override preprocessConfig(config: Record<string, string>): Record<string, string> {
    const result = { ...config }
    if (!result.widgetId) {
      result.widgetId = `w_${Date.now().toString(36)}`
    }
    return result
  }

  async testConnection(config: Record<string, string>): Promise<TestResult> {
    const webhookUrl = config.webhookUrl
    if (!webhookUrl) {
      return { ok: false, msg: 'Thiếu Webhook URL' }
    }
    try {
      new URL(webhookUrl)
    } catch {
      return { ok: false, msg: 'Webhook URL không hợp lệ' }
    }
    if (!webhookUrl.startsWith('https://')) {
      return { ok: false, msg: 'Webhook URL phải sử dụng HTTPS' }
    }
    return { ok: true, msg: `Cấu hình hợp lệ - Webhook: ${webhookUrl}` }
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    const env = getSecurityEnv()
    const timestampStr = headers.get('x-webhook-timestamp')
    const signature = headers.get(env.WEBHOOK_SIGNATURE_HEADER)

    if (!timestampStr || !signature) {
      return { valid: false, message: 'Thiếu timestamp hoặc signature header' }
    }

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) {
      return { valid: false, message: 'Timestamp không hợp lệ' }
    }

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestamp) > env.WEBHOOK_TIMESTAMP_TOLERANCE) {
      return { valid: false, message: `Timestamp quá cũ/mới. Tolerance: ${env.WEBHOOK_TIMESTAMP_TOLERANCE}s` }
    }

    const secret = config.webhookSecret || env.WEBHOOK_SECRET
    if (!secret) {
      return { valid: false, message: 'Webhook secret chưa được cấu hình' }
    }

    const signedPayload = `${timestamp}.${rawBody}`
    return verifyHmacSha256(signedPayload, signature, secret)
  }

  handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    const message = {
      platform: this.channelType,
      platformMessageId: payload.messageId || payload.id,
      senderId: payload.visitorId || payload.userId,
      senderName: payload.visitorName || null,
      content: payload.content || payload.message || '',
      messageType: payload.type || 'text',
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      attachmentType: payload.attachmentType,
    }
    return { received: 1, messages: [message] }
  }
}
