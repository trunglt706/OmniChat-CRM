import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Channel metadata (static config, not from DB)
// Production-ready: each field reflects the real credential requirements for the platform.
const CHANNEL_META: Record<string, {
  order: number
  fields: { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder: string }[]
  skipConfigCheck?: string[] // field keys that are optional or auto-generated
}> = {
  facebook_messenger: {
    order: 1,
    fields: [
      { key: 'appId', label: 'Facebook App ID', type: 'text', placeholder: 'VD: 1234567890123456' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: 987654321098765' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
      { key: 'verifyToken', label: 'Webhook Verify Token', type: 'text', placeholder: 'custom_verify_string' },
    ],
  },
  facebook_comment: {
    order: 2,
    fields: [
      { key: 'appId', label: 'Facebook App ID', type: 'text', placeholder: 'VD: 1234567890123456' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'VD: 987654321098765' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
    ],
  },
  zalo: {
    order: 3,
    fields: [
      { key: 'appId', label: 'Zalo App ID', type: 'text', placeholder: 'VD: 123456789012345678' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'VD: abc123def456...' },
      { key: 'oaId', label: 'OA ID', type: 'text', placeholder: 'VD: 123456789012345678' },
      { key: 'accessToken', label: 'Access Token (OA Token)', type: 'password', placeholder: 'ZAxxxxxxx...' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/zalo' },
    ],
  },
  telegram: {
    order: 4,
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456789:ABCdefGHI...' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/telegram' },
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
    skipConfigCheck: ['widgetId'],
    fields: [
      { key: 'widgetId', label: 'Widget ID', type: 'text', placeholder: 'Tự động tạo khi lưu' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhook/website' },
      { key: 'allowedDomains', label: 'Allowed Domains', type: 'text', placeholder: 'your-domain.com, app.your-domain.com' },
    ],
  },
  email: {
    order: 7,
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
      const skipKeys = meta.skipConfigCheck || []
      const isConfigured = meta.fields
        .filter(f => !skipKeys.includes(f.key))
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