import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookByChannel } from '@/lib/webhook-verify'

/**
 * POST /api/webhook/[channel]
 *
 * Universal webhook receiver for all channels.
 * Verifies the request signature before processing.
 *
 * URL params:
 *   - channel: facebook_messenger, zalo, telegram, chatwork, website
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params

  // 1. Verify webhook signature
  const rawBody = await request.text()
  const result = await verifyWebhookByChannel(channel, rawBody, request.headers)

  if (!result.valid) {
    return NextResponse.json(
      { error: 'Webhook verification failed', message: result.message },
      { status: 401 }
    )
  }

  // 2. Parse and process the webhook payload
  try {
    const payload = JSON.parse(rawBody)

    switch (channel) {
      case 'facebook_messenger':
      case 'facebook_comment':
        return handleFacebookWebhook(channel, payload)
      case 'zalo':
        return handleZaloWebhook(payload)
      case 'telegram':
        return handleTelegramWebhook(payload)
      case 'chatwork':
        return handleChatworkWebhook(payload)
      case 'website':
        return handleWebsiteWebhook(payload)
      default:
        return NextResponse.json({ error: 'Unsupported channel' }, { status: 400 })
    }
  } catch (e) {
    console.error(`[Webhook ${channel}] Parse error:`, e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

function handleFacebookWebhook(channel: string, payload: any) {
  if (payload.object === 'page' && payload.entry) {
    const messages = payload.entry.flatMap((entry: any) =>
      (entry.messaging || []).map((msg: any) => ({
        platform: channel,
        platformMessageId: msg.message?.mid,
        senderId: msg.sender?.id,
        senderName: null,
        content: msg.message?.text,
        messageType: msg.message?.attachments ? inferAttachmentType(msg.message.attachments[0]) : 'text',
        attachmentUrl: msg.message?.attachments?.[0]?.payload?.url,
        attachmentName: msg.message?.attachments?.[0]?.payload?.name,
        attachmentType: msg.message?.attachments?.[0]?.payload?.type,
      }))
    )
    return NextResponse.json({ received: messages.length, messages })
  }
  return NextResponse.json({ received: 0 })
}

function handleZaloWebhook(payload: any) {
  const messages = (payload.data || []).map((msg: any) => ({
    platform: 'zalo',
    platformMessageId: msg.message_id || msg.message?.msg_id,
    senderId: msg.user_id_by_app || msg.from?.user_id,
    senderName: null,
    content: msg.message?.content || msg.content,
    messageType: 'text',
    attachmentUrl: null,
    attachmentName: null,
    attachmentType: null,
  }))
  return NextResponse.json({ received: messages.length, messages })
}

function handleTelegramWebhook(payload: any) {
  const messages = (payload.result || []).map((update: any) => {
    const msg = update.message
    if (!msg) return null
    return {
      platform: 'telegram',
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
  return NextResponse.json({ received: messages.length, messages })
}

function handleChatworkWebhook(payload: any) {
  const evt = payload.webhook_event
  if (!evt) return NextResponse.json({ received: 0 })
  const message = {
    platform: 'chatwork',
    platformMessageId: String(evt.message_id),
    senderId: String(evt.from_account_id),
    senderName: null,
    content: evt.body || '',
    messageType: 'text',
    attachmentUrl: null, attachmentName: null, attachmentType: null,
  }
  return NextResponse.json({ received: 1, messages: [message] })
}

function handleWebsiteWebhook(payload: any) {
  const message = {
    platform: 'website',
    platformMessageId: payload.messageId || payload.id,
    senderId: payload.visitorId || payload.userId,
    senderName: payload.visitorName || null,
    content: payload.content || payload.message || '',
    messageType: payload.type || 'text',
    attachmentUrl: payload.attachmentUrl,
    attachmentName: payload.attachmentName,
    attachmentType: payload.attachmentType,
  }
  return NextResponse.json({ received: 1, messages: [message] })
}

function inferAttachmentType(a: any): string {
  if (a.type === 'image') return 'image'
  if (a.type === 'video') return 'video'
  if (a.type === 'audio') return 'audio'
  return 'file'
}
