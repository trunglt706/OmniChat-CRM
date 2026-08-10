/**
 * Facebook Comment Channel Adapter
 * 
 * Kế thừa FacebookMessengerAdapter vì:
 *   - Test connection: dùng chung pageAccessToken → graph.facebook.com
 *   - Webhook verify: dùng chung HMAC-SHA256 + appSecret
 *   - Webhook handle: khác — parse comment payload thay vì messaging
 */

import { FacebookMessengerAdapter } from './facebook-messenger'
import type { ChannelType, ChannelMeta, WebhookHandleResult } from '../types'

export class FacebookCommentAdapter extends FacebookMessengerAdapter {
  readonly channelType: ChannelType = 'facebook_comment'

  override readonly meta: ChannelMeta = {
    order: 2,
    label: 'FB Comment',
    color: '#1877f2',
    iconName: 'MessageSquare',
    fields: [
      { key: 'appId', label: 'Facebook App ID', type: 'text', placeholder: 'VD: 1234567890123456' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: 987654321098765' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
    ],
  }

  /** 
   * Comment webhook có thể dùng chung test với Messenger (cùng pageAccessToken) 
   * hoặc override riêng nếu cần.
   */

  /**
   * Xử lý Facebook Comment webhook payload.
   * Payload khác Messenger — dùng 'changes' thay vì 'messaging'.
   */
  override handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    // Facebook Comments webhook structure:
    // { entry: [{ changes: [{ value: { comment_id, message, from, ... } }] }] }
    if (payload.object === 'page' && payload.entry) {
      const messages = payload.entry.flatMap((entry: any) =>
        (entry.changes || []).map((change: any) => {
          const val = change.value || {}
          const comment = val.comment_id ? val : (val.from ? val : {})
          return {
            platform: this.channelType,
            platformMessageId: comment.comment_id || null,
            senderId: comment.from?.id || null,
            senderName: comment.from?.name || null,
            content: comment.message || comment.comment_text || '',
            messageType: 'text',
            attachmentUrl: comment.attachment_url || null,
            attachmentName: null,
            attachmentType: null,
          }
        })
      )
      return { received: messages.length, messages }
    }
    return { received: 0, messages: [] }
  }

  override async sendMessage(
    to: string, // For comments, 'to' should be the comment_id to reply to
    message: { content: string; messageType?: string; attachmentUrl?: string },
    config: Record<string, string>
  ): Promise<{ platformMessageId: string } | { error: string }> {
    const token = config.pageAccessToken
    if (!token) return { error: 'Thiếu Page Access Token' }

    try {
      const payload: any = {
        message: message.content
      }

      // 'to' should be the comment ID we are replying to
      const res = await fetch(`https://graph.facebook.com/v21.0/${to}/comments?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.error) {
        return { error: `Facebook API lỗi: ${data.error.message}` }
      }
      return { platformMessageId: String(data.id) }
    } catch (e: any) {
      return { error: e.message || 'Lỗi mạng khi gọi Facebook API' }
    }
  }
}
