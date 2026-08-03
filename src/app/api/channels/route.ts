import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Channel metadata (static config, not from DB)
const CHANNEL_META: Record<string, { order: number; fields: { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder: string }[] }> = {
  facebook_messenger: {
    order: 1,
    fields: [
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: OmniChat Official' },
      { key: 'token', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
      { key: 'verifyToken', label: 'Verify Token', type: 'text', placeholder: 'custom_verify_string' },
    ],
  },
  facebook_comment: {
    order: 2,
    fields: [
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: OmniChat Official' },
      { key: 'token', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
    ],
  },
  zalo: {
    order: 3,
    fields: [
      { key: 'oaId', label: 'OA ID', type: 'text', placeholder: 'VD: 123456789012345678' },
      { key: 'token', label: 'Access Token', type: 'password', placeholder: 'ZAxxxxxxx...' },
      { key: 'phone', label: 'Số điện thoại OA', type: 'text', placeholder: '0901 234 567' },
    ],
  },
  telegram: {
    order: 4,
    fields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...' },
    ],
  },
  chatwork: {
    order: 5,
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'roomId', label: 'Room ID mặc định', type: 'text', placeholder: 'VD: 12345678' },
    ],
  },
  website: {
    order: 6,
    fields: [
      { key: 'webhook', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/messenger' },
      { key: 'widgetId', label: 'Widget ID', type: 'text', placeholder: 'Tự động tạo khi lưu' },
    ],
  },
  email: {
    order: 7,
    fields: [
      { key: 'email', label: 'Địa chỉ email', type: 'text', placeholder: 'support@company.com' },
      { key: 'imapHost', label: 'IMAP Server', type: 'text', placeholder: 'imap.gmail.com' },
      { key: 'imapPort', label: 'IMAP Port', type: 'text', placeholder: '993' },
      { key: 'imapUser', label: 'IMAP Username', type: 'text', placeholder: 'support@company.com' },
      { key: 'imapPass', label: 'IMAP Password', type: 'password', placeholder: 'app-password' },
      { key: 'smtpHost', label: 'SMTP Server', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'text', placeholder: '587' },
    ],
  },
}

// GET: Return all channels with their DB config merged with metadata
export async function GET() {
  const dbConfigs = await db.channelConfig.findMany()
  const configMap = new Map(dbConfigs.map(c => [c.channel, c]))

  const channels = Object.entries(CHANNEL_META)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => {
      const dbCfg = configMap.get(key)
      const config: Record<string, string> = dbCfg ? JSON.parse(dbCfg.config) : {}
      const isConfigured = meta.fields
        .filter(f => f.key !== 'widgetId') // widgetId is auto-generated
        .some(f => config[f.key] && config[f.key].length > 0)

      return {
        key,
        enabled: dbCfg?.enabled ?? false,
        configured: isConfigured,
        config: Object.fromEntries(
          meta.fields.map(f => [f.key, config[f.key] || ''])
        ),
        fields: meta.fields,
        lastTestAt: dbCfg?.lastTestAt?.toISOString() || null,
        lastTestOk: dbCfg?.lastTestOk ?? null,
        lastTestMsg: dbCfg?.lastTestMsg || null,
      }
    })

  return NextResponse.json(channels)
}

// PUT: Update channel config (upsert)
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { channel, enabled, config } = body

  if (!channel || !CHANNEL_META[channel]) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }

  // Auto-generate widgetId for website channel
  const finalConfig = { ...config }
  if (channel === 'website' && !finalConfig.widgetId) {
    finalConfig.widgetId = `w_${Date.now().toString(36)}`
  }

  const dbConfig = await db.channelConfig.upsert({
    where: { channel },
    create: {
      channel,
      enabled: enabled ?? false,
      config: JSON.stringify(finalConfig),
    },
    update: {
      enabled: enabled ?? false,
      config: JSON.stringify(finalConfig),
    },
  })

  return NextResponse.json({
    channel: dbConfig.channel,
    enabled: dbConfig.enabled,
    configured: true,
    config: finalConfig,
  })
}