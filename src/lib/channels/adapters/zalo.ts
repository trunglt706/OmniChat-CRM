/**
 * Zalo OA Channel Adapter
 */

import {
  BaseChannelAdapter,
  type ChannelType,
  type ChannelMeta,
  type TestResult,
  type WebhookVerifyResult,
  type WebhookHandleResult,
} from '../types'
import { verifyHmacSha256 } from '@/lib/webhook-verify'

export class ZaloAdapter extends BaseChannelAdapter {
  readonly channelType: ChannelType = 'zalo'

  readonly meta: ChannelMeta = {
    order: 3,
    label: 'Zalo',
    color: '#0068ff',
    iconName: 'Phone',
    fields: [
      { key: 'appId', label: 'Zalo App ID', type: 'text', placeholder: 'VD: 123456789012345678' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'oaId', label: 'OA ID', type: 'text', placeholder: 'VD: 123456789012345678' },
      { key: 'accessToken', label: 'Access Token (OA Token)', type: 'password', placeholder: 'ZAxxxxxxx...' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/zalo' },
    ],
  }

  async testConnection(config: Record<string, string>): Promise<TestResult> {
    const token = config.accessToken
    if (!token) return { ok: false, msg: 'Thiếu Access Token (OA Token)' }

    try {
      const res = await this.fetchWithTimeout('https://openapi.zalo.me/v2.0/oa/getoa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data: {} }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, msg: `Zalo API lỗi ${res.status}: ${err?.message || err?.error?.message || 'Không xác định'}` }
      }
      const data = await res.json()
      if (data.error !== 0) {
        return { ok: false, msg: `Zalo API lỗi: ${data.message || 'Không xác định'}` }
      }
      const oaName = data.data?.name || config.oaId || 'OA'
      return { ok: true, msg: `Kết nối thành công - OA: ${oaName}` }
    } catch (e) {
      return this.testError(e, 'Zalo')
    }
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    const signature = headers.get('x-zalo-signature')
    if (!signature) {
      return { valid: false, message: 'Thiếu X-Zalo-Signature header' }
    }
    const secret = config.appSecret || ''
    if (!secret) {
      return { valid: false, message: 'App Secret chưa được cấu hình' }
    }
    return verifyHmacSha256(rawBody, signature, secret)
  }

  handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    const messages = (payload.data || []).map((msg: any) => ({
      platform: this.channelType,
      platformMessageId: msg.message_id || msg.message?.msg_id,
      senderId: msg.user_id_by_app || msg.from?.user_id,
      senderName: null,
      content: msg.message?.content || msg.content,
      messageType: 'text',
      attachmentUrl: null,
      attachmentName: null,
      attachmentType: null,
    }))
    return { received: messages.length, messages }
  }
}
