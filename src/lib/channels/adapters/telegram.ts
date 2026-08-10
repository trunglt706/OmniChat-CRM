/**
 * Telegram Bot Channel Adapter
 */

import {
  BaseChannelAdapter,
  type ChannelType,
  type ChannelMeta,
  type TestResult,
  type WebhookVerifyResult,
  type WebhookHandleResult,
} from '../types'

export class TelegramAdapter extends BaseChannelAdapter {
  readonly channelType: ChannelType = 'telegram'

  readonly meta: ChannelMeta = {
    order: 4,
    label: 'Telegram',
    color: '#26a5e4',
    iconName: 'Send',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456789:ABCdefGHI...' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/telegram' },
    ],
  }

  async testConnection(config: Record<string, string>): Promise<TestResult> {
    const botToken = config.botToken
    if (!botToken) return { ok: false, msg: 'Thiếu Bot Token' }

    try {
      const res = await this.fetchWithTimeout(
        `https://api.telegram.org/bot${encodeURIComponent(botToken)}/getMe`
      )
      if (!res.ok) {
        return { ok: false, msg: `Telegram API lỗi ${res.status}: Không thể xác thực token` }
      }
      const data = await res.json()
      if (!data.ok) {
        return { ok: false, msg: `Telegram: ${data.description || 'Token không hợp lệ'}` }
      }
      const bot = data.result
      return { ok: true, msg: `Kết nối thành công - Bot: @${bot.username} (${bot.first_name})` }
    } catch (e) {
      return this.testError(e, 'Telegram')
    }
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Headers,
    _config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    // Tạm thời vô hiệu hoá verify signature
    return { valid: true, message: 'OK' }
  }

  handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    const messages = (payload.result || []).map((update: any) => {
      const msg = update.message
      if (!msg) return null
      return {
        platform: this.channelType,
        platformMessageId: String(msg.message_id),
        senderId: String(msg.from?.id),
        senderName: msg.from?.first_name,
        content: msg.text || msg.caption || '',
        messageType: msg.photo ? 'image' : (msg.video ? 'video' : 'text'),
        attachmentUrl: msg.document?.file_url,
        attachmentName: msg.document?.file_name,
        attachmentType: msg.document?.mime_type,
      }
    }).filter(Boolean)
    return { received: messages.length, messages: messages as any[] }
  }
}
