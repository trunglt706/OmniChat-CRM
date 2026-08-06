import { NextRequest, NextResponse } from 'next/server'
import { channelRegistry } from '@/lib/channels'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Universal webhook receiver for all channels.
 *
 * POST /api/webhook/[channel]
 * - Verifies signature via channel adapter
 * - Parses payload via channel adapter
 * - Returns standardized response
 *
 * Supported channels are determined by channelRegistry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params

  // 1. Check if channel is supported
  if (!channelRegistry.has(channel)) {
    return NextResponse.json(
      { error: `Kênh '${channel}' không được hỗ trợ` },
      { status: 400 }
    )
  }

  // 2. Read raw body for signature verification
  const rawBody = await request.text()

  // 3. Get channel config from DB for verification
  const config = await db.channelConfig.findUnique({
    where: { channel },
  })
  const channelConfig: Record<string, string> = config
    ? JSON.parse(config.config)
    : {}

  // 4. Verify webhook signature via adapter
  const verifyResult = await channelRegistry.verifyWebhook(
    channel,
    rawBody,
    request.headers,
    channelConfig
  )

  if (!verifyResult.valid) {
    return NextResponse.json(
      { error: 'Webhook verification failed', message: verifyResult.message },
      { status: 401 }
    )
  }

  // 5. Parse and handle payload via adapter
  try {
    const payload = JSON.parse(rawBody)
    const result = channelRegistry.handleWebhook(channel, payload, channel)
    return NextResponse.json(result)
  } catch (e) {
    logger.error(`[Webhook ${channel}] Parse error`, e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
