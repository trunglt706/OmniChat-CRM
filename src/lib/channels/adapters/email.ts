/**
 * Email (IMAP/SMTP) Channel Adapter
 * 
 * Không gọi API bên ngoài cho test — chỉ validate cấu hình.
 * Email webhook không có signature verification thực sự.
 */

import {
  BaseChannelAdapter,
  type ChannelType,
  type ChannelMeta,
  type TestResult,
  type WebhookVerifyResult,
  type WebhookHandleResult,
} from '../types'

export class EmailAdapter extends BaseChannelAdapter {
  readonly channelType: ChannelType = 'email'

  readonly meta: ChannelMeta = {
    order: 7,
    label: 'Email',
    color: '#ea4335',
    iconName: 'Mail',
    fields: [
      { key: 'email', label: 'Địa chỉ email', type: 'text', placeholder: 'support@company.com' },
      { key: 'imapHost', label: 'IMAP Server', type: 'text', placeholder: 'imap.gmail.com' },
      { key: 'imapPort', label: 'IMAP Port', type: 'text', placeholder: '993' },
      { key: 'imapUser', label: 'IMAP Username', type: 'text', placeholder: 'support@company.com' },
      { key: 'imapPass', label: 'IMAP Password / App Password', type: 'password', placeholder: 'app-password' },
      { key: 'smtpHost', label: 'SMTP Server', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'text', placeholder: '587' },
      { key: 'smtpUser', label: 'SMTP Username', type: 'text', placeholder: 'support@company.com (để trống = giống IMAP)' },
      { key: 'smtpPass', label: 'SMTP Password / App Password', type: 'password', placeholder: 'để trống = giống IMAP Password' },
    ],
  }

  async testConnection(config: Record<string, string>): Promise<TestResult> {
    const { imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, email: addr } = config

    if (!imapHost || !imapUser || !imapPass) {
      return { ok: false, msg: 'Thiếu thông tin IMAP (host, user, password)' }
    }

    const port = parseInt(imapPort || '993', 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      return { ok: false, msg: `IMAP Port ${imapPort} không hợp lệ` }
    }

    const smtpPortNum = parseInt(smtpPort || '587', 10)
    if (isNaN(smtpPortNum) || smtpPortNum < 1 || smtpPortNum > 65535) {
      return { ok: false, msg: `SMTP Port ${smtpPort} không hợp lệ` }
    }

    if (!imapHost.includes('.') && !imapHost.includes('localhost')) {
      return { ok: false, msg: `IMAP Host '${imapHost}' có vẻ không hợp lệ` }
    }

    if (smtpHost && !smtpHost.includes('.') && !smtpHost.includes('localhost')) {
      return { ok: false, msg: `SMTP Host '${smtpHost}' có vẻ không hợp lệ` }
    }

    return {
      ok: true,
      msg: `Cấu hình email hợp lệ - IMAP: ${imapHost}:${port}, SMTP: ${smtpHost || imapHost}:${smtpPortNum}${addr ? ` (${addr})` : ''}`,
    }
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Headers,
    _config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    // Email không có webhook signature verification thực sự
    // Trong production, có thể dùng SPF/DKIM/DMARC check
    return { valid: true, message: 'Email webhook - không có signature verification' }
  }

  handleWebhook(payload: any, _channel: string): WebhookHandleResult {
    const message = {
      platform: this.channelType,
      platformMessageId: payload.messageId || payload.id,
      senderId: payload.from || payload.sender,
      senderName: payload.fromName || payload.senderName,
      content: payload.text || payload.body || payload.content || '',
      messageType: payload.hasAttachments ? 'file' : 'text',
      attachmentUrl: null,
      attachmentName: payload.subject || null,
      attachmentType: null,
    }
    return { received: 1, messages: [message] }
  }
}