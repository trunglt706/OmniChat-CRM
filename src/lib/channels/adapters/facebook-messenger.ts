/**
 * Facebook Messenger Channel Adapter
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

export class FacebookMessengerAdapter extends BaseChannelAdapter {
  readonly channelType: ChannelType = 'facebook_messenger'

  readonly meta: ChannelMeta = {
    order: 1,
    label: 'Messenger',
    color: '#1877f2',
    iconName: 'MessageCircle',
    fields: [
      { key: 'appId', label: 'Facebook App ID', type: 'text', placeholder: 'VD: 1234567890123456' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: 987654321098765' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
      { key: 'verifyToken', label: 'Webhook Verify Token', type: 'text', placeholder: 'custom_verify_string' },
    ],
  }

  async testConnection(config: Record<string, string>): Promise<TestResult> {
    const token = config.pageAccessToken
    if (!token) return { ok: false, msg: 'Thiếu Page Access Token' }

    try {
      const res = await this.fetchWithTimeout(
        `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}&fields=id,name`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, msg: `Facebook API lỗi ${res.status}: ${err?.error?.message || 'Không xác định'}` }
      }
      const data = await res.json()
      return { ok: true, msg: `Kết nối thành công - Page: ${data.name || data.id}` }
    } catch (e) {
      return this.testError(e, 'Facebook')
    }
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    const signature = headers.get('x-hub-signature-256')
    if (!signature) {
      return { valid: false, message: 'Thiếu X-Hub-Signature-256 header' }
    }
    const secret = config.appSecret || ''
    if (!secret) {
      return { valid: false, message: 'App Secret chưa được cấu hình' }
    }
    return verifyHmacSha256(rawBody, signature, secret)
  }

  handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    if (payload.object === 'page' && payload.entry) {
      const messages = payload.entry.flatMap((entry: any) =>
        (entry.messaging || []).map((msg: any) => ({
          platform: this.channelType,
          platformMessageId: msg.message?.mid,
          senderId: msg.sender?.id,
          senderName: null,
          content: msg.message?.text,
          messageType: msg.message?.attachments ? this.inferAttachmentType(msg.message.attachments[0]) : 'text',
          attachmentUrl: msg.message?.attachments?.[0]?.payload?.url,
          attachmentName: msg.message?.attachments?.[0]?.payload?.name,
          attachmentType: msg.message?.attachments?.[0]?.payload?.type,
        }))
      )
      return { received: messages.length, messages }
    }
    return { received: 0, messages: [] }
  }

  protected inferAttachmentType(a: any): string {
    if (a.type === 'image') return 'image'
    if (a.type === 'video') return 'video'
    if (a.type === 'audio') return 'audio'
    return 'file'
  }

  async sendMessage(
    to: string,
    message: { content: string; messageType?: string; attachmentUrl?: string },
    config: Record<string, string>
  ): Promise<{ platformMessageId: string } | { error: string }> {
    const token = config.pageAccessToken
    if (!token) return { error: 'Thiếu Page Access Token' }

    try {
      const payload: any = {
        recipient: { id: to },
        message: { text: message.content }
      }

      const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.error) {
        return { error: `Facebook API lỗi: ${data.error.message}` }
      }
      return { platformMessageId: String(data.message_id) }
    } catch (e: any) {
      return { error: e.message || 'Lỗi mạng khi gọi Facebook API' }
    }
  }
}
