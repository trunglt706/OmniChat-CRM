import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { channelRegistry } from '@/lib/channels'

// GET: Return all channels with their DB config merged with adapter metadata
export async function GET() {
  const dbConfigs = await db.channelConfig.findMany()
  const configMap = new Map(dbConfigs.map(c => [c.channel, c]))

  const channels = channelRegistry.getAllMeta().map(({ channelType, ...meta }) => {
    const dbCfg = configMap.get(channelType)
    const config: Record<string, string> = dbCfg ? JSON.parse(dbCfg.config) : {}
    const skipKeys = meta.skipConfigCheck || []
    const isConfigured = meta.fields
      .filter(f => !skipKeys.includes(f.key))
      .some(f => config[f.key] && config[f.key].length > 0)

    return {
      key: channelType,
      label: meta.label,
      color: meta.color,
      iconName: meta.iconName,
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

  if (!channel || !channelRegistry.has(channel)) {
    return NextResponse.json({ error: 'Kênh không hợp lệ' }, { status: 400 })
  }

  // Let adapter preprocess config (e.g., auto-generate widgetId for website)
  const finalConfig = channelRegistry.preprocessConfig(channel, config || {})

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