import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ═══════════════════════════════════════════
// ─── Helper Functions ───
// ═══════════════════════════════════════════

const CHANNEL_DISPLAY: Record<string, string> = {
  facebook_messenger: 'Facebook Messenger',
  facebook_comment: 'Facebook Comment',
  zalo: 'Zalo',
  telegram: 'Telegram',
  website: 'Website',
  email: 'Email',
  chatwork: 'Chatwork',
}

function getChannelName(channel: string): string {
  return CHANNEL_DISPLAY[channel] || channel
}

function formatDuration(ms: number): string {
  if (ms <= 0 || !isFinite(ms)) return '0s'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${s}s`
}

function getDateRange(
  startDate: string | null,
  endDate: string | null,
  days: number
): { start: Date; end: Date } {
  if (startDate && endDate) {
    const s = new Date(startDate + 'T00:00:00')
    const e = new Date(endDate + 'T00:00:00')
    e.setDate(e.getDate() + 1)
    return { start: s, end: e }
  }
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  return { start, end }
}

function getDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  if (diffMs <= 0) return 'just now'
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHr > 0) return `${diffHr}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return 'just now'
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function formatValue(val: number | null | undefined): string {
  if (val == null || val === 0) return '$0'
  if (val >= 1_000_000) return `~${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `~${(val / 1_000).toFixed(1)}K`
  return `~${val.toFixed(0)}`
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// ═══════════════════════════════════════════
// ─── Shared Data Fetcher ───
// ═══════════════════════════════════════════

interface ConvRow {
  id: number
  createdAt: Date
  updatedAt: Date
  status: string
  channel: string
  customerId: number
  ownerId: number | null
}

interface MsgRow {
  conversationId: number
  senderType: string
  senderId: number | null
  createdAt: Date
}

interface ConvDataBundle {
  convs: ConvRow[]
  msgsByConv: Map<number, MsgRow[]>
  responseTimes: Map<number, number>
  resolutionTimes: Map<number, number>
  msgCounts: Map<number, number>
}

async function fetchConvData(start: Date, end: Date): Promise<ConvDataBundle> {
  const convs = await db.conversation.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: {
      id: true, createdAt: true, updatedAt: true,
      status: true, channel: true, customerId: true, ownerId: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const convIds = convs.map(c => c.id)

  // Non-system messages for response time calculations
  const nonSysMsgs = convIds.length > 0
    ? await db.message.findMany({
        where: {
          conversationId: { in: convIds },
          senderType: { in: ['customer', 'agent', 'bot'] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          conversationId: true, senderType: true, senderId: true, createdAt: true,
        },
      })
    : []

  // Total message counts per conversation (all types)
  const msgCountRows = convIds.length > 0
    ? await db.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: convIds } },
        _count: { id: true },
      })
    : []

  const msgsByConv = new Map<number, MsgRow[]>()
  for (const msg of nonSysMsgs) {
    const list = msgsByConv.get(msg.conversationId) || []
    list.push(msg)
    msgsByConv.set(msg.conversationId, list)
  }

  const msgCounts = new Map(msgCountRows.map(r => [r.conversationId, r._count.id]))

  const responseTimes = new Map<number, number>()
  const resolutionTimes = new Map<number, number>()

  for (const conv of convs) {
    const cMsgs = msgsByConv.get(conv.id) || []

    // First response time: first customer → first agent/bot after it
    let firstCustTime: Date | null = null
    for (const m of cMsgs) {
      if (m.senderType === 'customer') { firstCustTime = m.createdAt; break }
    }
    if (firstCustTime) {
      for (const m of cMsgs) {
        if ((m.senderType === 'agent' || m.senderType === 'bot') && m.createdAt > firstCustTime) {
          responseTimes.set(conv.id, m.createdAt.getTime() - firstCustTime.getTime())
          break
        }
      }
    }

    // Resolution time for resolved/closed conversations
    if (conv.status === 'resolved' || conv.status === 'closed') {
      resolutionTimes.set(conv.id, conv.updatedAt.getTime() - conv.createdAt.getTime())
    }
  }

  return { convs, msgsByConv, responseTimes, resolutionTimes, msgCounts }
}

// ═══════════════════════════════════════════
// ─── 1. Conversations Report ───
// ═══════════════════════════════════════════

async function getConversationsReport(start: Date, end: Date) {
  const { convs, responseTimes, resolutionTimes } = await fetchConvData(start, end)

  // Group by date
  const byDate = new Map<string, ConvRow[]>()
  for (const c of convs) {
    const key = getDateKey(c.createdAt)
    const list = byDate.get(key) || []
    list.push(c)
    byDate.set(key, list)
  }

  // Build date range array
  const dates: string[] = []
  const cur = new Date(start)
  while (cur < end) {
    dates.push(getDateKey(cur))
    cur.setDate(cur.getDate() + 1)
  }

  return dates.map(date => {
    const dayConvos = byDate.get(date) || []
    const total = dayConvos.length
    const open = dayConvos.filter(c => c.status === 'open' || c.status === 'pending').length
    const resolved = dayConvos.filter(c => c.status === 'resolved').length
    const closed = dayConvos.filter(c => c.status === 'closed').length

    const rtList: number[] = []
    const resList: number[] = []
    for (const c of dayConvos) {
      const rt = responseTimes.get(c.id)
      if (rt != null) rtList.push(rt)
      const res = resolutionTimes.get(c.id)
      if (res != null) resList.push(res)
    }

    return {
      date,
      total,
      open,
      resolved,
      closed,
      avgResponseTime: formatDuration(avg(rtList)),
      avgResolutionTime: formatDuration(avg(resList)),
    }
  })
}

// ═══════════════════════════════════════════
// ─── 2. Agents Report ───
// ═══════════════════════════════════════════

async function getAgentsReport(start: Date, end: Date) {
  // Get users who own conversations in range
  const agents = await db.user.findMany({
    where: {
      role: { in: ['admin', 'supervisor', 'agent'] },
      assignedConvos: { some: { createdAt: { gte: start, lt: end } } },
    },
    select: { id: true, name: true, status: true },
    orderBy: { name: 'asc' },
  })

  if (agents.length === 0) return []

  const agentIds = agents.map(a => a.id)

  // Conversation counts per agent
  const convCounts = await db.conversation.groupBy({
    by: ['ownerId'],
    where: { ownerId: { in: agentIds }, createdAt: { gte: start, lt: end } },
    _count: { id: true },
  })
  const convCountMap = new Map(convCounts.map(r => [r.ownerId!, r._count.id]))

  // Resolved counts per agent
  const resolvedCounts = await db.conversation.groupBy({
    by: ['ownerId'],
    where: {
      ownerId: { in: agentIds },
      createdAt: { gte: start, lt: end },
      status: 'resolved',
    },
    _count: { id: true },
  })
  const resolvedCountMap = new Map(resolvedCounts.map(r => [r.ownerId!, r._count.id]))

  // Message counts per agent
  const agentMsgCounts = await db.message.groupBy({
    by: ['senderId'],
    where: {
      senderId: { in: agentIds },
      senderType: 'agent',
      createdAt: { gte: start, lt: end },
    },
    _count: { id: true },
  })
  const agentMsgCountMap = new Map(agentMsgCounts.map(r => [r.senderId!, r._count.id]))

  // Active hours: fetch message timestamps per agent
  const agentMsgTimestamps = await db.message.findMany({
    where: {
      senderId: { in: agentIds },
      senderType: 'agent',
      createdAt: { gte: start, lt: end },
    },
    select: { senderId: true, createdAt: true },
  })
  const hourSets = new Map<number, Set<string>>()
  for (const m of agentMsgTimestamps) {
    if (!m.senderId) continue
    const set = hourSets.get(m.senderId) || new Set()
    const d = m.createdAt
    set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`)
    hourSets.set(m.senderId, set)
  }

  // Response times for agent conversations: use fetchConvData
  const { convs, responseTimes } = await fetchConvData(start, end)
  const agentConvIds = convs.filter(c => c.ownerId && agentIds.includes(c.ownerId)).map(c => c.id)
  const agentRts = agentConvIds.map(id => responseTimes.get(id)).filter((v): v is number => v != null)
  const overallAvgRt = avg(agentRts)

  return agents.map(agent => {
    const agentConvs = convs.filter(c => c.ownerId === agent.id)
    const rts = agentConvs.map(c => responseTimes.get(c.id)).filter((v): v is number => v != null)

    return {
      id: agent.id,
      name: agent.name,
      conversations: convCountMap.get(agent.id) || 0,
      messages: agentMsgCountMap.get(agent.id) || 0,
      avgResponseTime: formatDuration(avg(rts) || overallAvgRt),
      resolved: resolvedCountMap.get(agent.id) || 0,
      satisfaction: '0.0',
      activeHours: `${(hourSets.get(agent.id)?.size || 0)}h`,
      status: agent.status || 'offline',
    }
  })
}

// ═══════════════════════════════════════════
// ─── 3. SLA Report ───
// ═══════════════════════════════════════════

async function getSlaReport(start: Date, end: Date) {
  const { convs, responseTimes, resolutionTimes } = await fetchConvData(start, end)

  // Metric 1: First Response < 5min
  const rtValues = Array.from(responseTimes.values())
  const fiveMin = 5 * 60 * 1000
  const rtCompliant = rtValues.filter(rt => rt < fiveMin).length
  const rtTotal = rtValues.length
  const rtAvg = avg(rtValues)

  // Metric 2: Resolution < 2h
  const resValues = Array.from(resolutionTimes.values())
  const twoHr = 2 * 60 * 60 * 1000
  const resCompliant = resValues.filter(r => r < twoHr).length
  const resTotal = resValues.length
  const resAvg = avg(resValues)

  // Metric 3: Satisfaction >= 4.0 (no satisfaction data in schema)
  const satCompliant = 0
  const satTotal = convs.length

  return [
    {
      metric: 'First Response (< 5min)',
      target: '< 5 min',
      actual: formatDuration(rtAvg),
      compliance: rtTotal > 0 ? `${Math.round((rtCompliant / rtTotal) * 100)}%` : '0%',
    },
    {
      metric: 'Resolution (< 2h)',
      target: '< 2h',
      actual: formatDuration(resAvg),
      compliance: resTotal > 0 ? `${Math.round((resCompliant / resTotal) * 100)}%` : '0%',
    },
    {
      metric: 'Customer Satisfaction (≥ 4.0)',
      target: '≥ 4.0',
      actual: '0.0',
      compliance: satTotal > 0 ? `${Math.round((satCompliant / satTotal) * 100)}%` : '0%',
    },
  ]
}

// ═══════════════════════════════════════════
// ─── 4. Channels Report ───
// ═══════════════════════════════════════════

async function getChannelsReport(start: Date, end: Date) {
  const { convs, responseTimes, resolutionTimes, msgCounts } = await fetchConvData(start, end)

  // Group by channel
  const byChannel = new Map<string, ConvRow[]>()
  for (const c of convs) {
    const list = byChannel.get(c.channel) || []
    list.push(c)
    byChannel.set(c.channel, list)
  }

  return Array.from(byChannel.entries()).map(([channel, channelConvs]) => {
    const rts = channelConvs.map(c => responseTimes.get(c.id)).filter((v): v is number => v != null)
    const resolved = channelConvs.filter(c => c.status === 'resolved' || c.status === 'closed').length
    const totalMsgs = channelConvs.reduce((sum, c) => sum + (msgCounts.get(c.id) || 0), 0)

    return {
      id: channel,
      key: channel,
      channel: getChannelName(channel),
      conversations: channelConvs.length,
      messages: totalMsgs,
      avgResponseTime: formatDuration(avg(rts)),
      resolutionRate: channelConvs.length > 0
        ? `${Math.round((resolved / channelConvs.length) * 100)}%`
        : '0%',
      satisfaction: '0.0',
    }
  })
}

// ═══════════════════════════════════════════
// ─── 5. Customers Report ───
// ═══════════════════════════════════════════

async function getCustomersReport(start: Date, end: Date) {
  // Get conversations in range with customer info
  const convs = await db.conversation.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: {
      id: true, createdAt: true, channel: true, customerId: true,
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const convIds = convs.map(c => c.id)
  const customerIds = [...new Set(convs.map(c => c.customerId))]

  // Message counts per conversation
  const msgCountRows = convIds.length > 0
    ? await db.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: convIds } },
        _count: { id: true },
      })
    : []
  const msgCountMap = new Map(msgCountRows.map(r => [r.conversationId, r._count.id]))

  // Last active per customer: latest message timestamp
  const lastActiveRows = convIds.length > 0
    ? await db.message.findMany({
        where: { conversationId: { in: convIds } },
        select: { conversationId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        distinct: ['conversationId'],
      })
    : []
  // Build convId→createdAt map
  const convLastMsg = new Map(lastActiveRows.map(r => [r.conversationId, r.createdAt]))

  // Lead values per customer
  const leadSums = customerIds.length > 0
    ? await db.lead.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds } },
        _sum: { value: true },
      })
    : []
  const leadValueMap = new Map(leadSums.map(r => [r.customerId, r._sum.value || 0]))

  // Also check conversations outside range for total lead value per customer
  const allCustomerLeadSums = customerIds.length > 0
    ? await db.lead.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds } },
        _sum: { value: true },
      })
    : []
  // (reuse leadSums since we already have all leads for these customers)

  // Group conversations by customer
  const byCustomer = new Map<number, { name: string; convs: typeof convs; totalMsgs: number; lastActive: Date; channels: Map<string, number> }>()
  for (const c of convs) {
    const existing = byCustomer.get(c.customerId)
    if (existing) {
      existing.convs.push(c)
      existing.totalMsgs += msgCountMap.get(c.id) || 0
      if (c.createdAt > existing.lastActive) existing.lastActive = c.createdAt
      const cnt = existing.channels.get(c.channel) || 0
      existing.channels.set(c.channel, cnt + 1)
    } else {
      const channels = new Map<string, number>()
      channels.set(c.channel, 1)
      byCustomer.set(c.customerId, {
        name: c.customer.name,
        convs: [c],
        totalMsgs: msgCountMap.get(c.id) || 0,
        lastActive: c.createdAt,
        channels,
      })
    }
  }

  // Get the latest message time across ALL conversations for each customer
  const custLastActive = new Map<number, Date>()
  for (const c of convs) {
    const msgTime = convLastMsg.get(c.id) || c.createdAt
    const existing = custLastActive.get(c.customerId)
    if (!existing || msgTime > existing) {
      custLastActive.set(c.customerId, msgTime)
    }
  }

  return Array.from(byCustomer.entries())
    .sort((a, b) => b[1].convs.length - a[1].convs.length)
    .map(([custId, data]) => {
      // Primary channel = most used
      let primaryChannel = 'website'
      let maxCh = 0
      for (const [ch, cnt] of data.channels) {
        if (cnt > maxCh) { maxCh = cnt; primaryChannel = ch }
      }

      return {
        id: custId,
        name: data.name,
        conversations: data.convs.length,
        messages: data.totalMsgs,
        lastActive: timeAgo(custLastActive.get(custId) || data.lastActive),
        primaryChannel,
        value: formatValue(leadValueMap.get(custId)),
      }
    })
}

// ═══════════════════════════════════════════
// ─── 6. Messages Report ───
// ═══════════════════════════════════════════

async function getMessagesReport(start: Date, end: Date) {
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    period: `${String(i).padStart(2, '0')}:00`,
    incoming: 0,
    outgoing: 0,
    total: 0,
  }))

  const messages = await db.message.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      senderType: { in: ['customer', 'agent', 'bot'] },
    },
    select: { senderType: true, createdAt: true },
  })

  for (const msg of messages) {
    const hour = msg.createdAt.getHours()
    const isCustomer = msg.senderType === 'customer'
    hourlyData[hour].incoming += isCustomer ? 1 : 0
    hourlyData[hour].outgoing += isCustomer ? 0 : 1
    hourlyData[hour].total += 1
  }

  const peakHour = hourlyData.reduce((max, cur) => cur.total > max.total ? cur : max, hourlyData[0]).period

  return { hourly: hourlyData, peakHour }
}

// ═══════════════════════════════════════════
// ─── 7. Response Time Report ───
// ═══════════════════════════════════════════

async function getResponseTimeReport(start: Date, end: Date) {
  const { responseTimes } = await fetchConvData(start, end)
  const rtValues = Array.from(responseTimes.values())

  const bucketDefs = [
    { bucket: '< 1 min', minMs: 0, maxMs: 60_000 },
    { bucket: '1-3 min', minMs: 60_000, maxMs: 180_000 },
    { bucket: '3-5 min', minMs: 180_000, maxMs: 300_000 },
    { bucket: '5-10 min', minMs: 300_000, maxMs: 600_000 },
    { bucket: '10-30 min', minMs: 600_000, maxMs: 1_800_000 },
    { bucket: '> 30 min', minMs: 1_800_000, maxMs: Infinity },
  ]

  const total = rtValues.length
  const buckets = bucketDefs.map(b => {
    const matching = rtValues.filter(rt => rt >= b.minMs && rt < b.maxMs)
    return {
      bucket: b.bucket,
      count: matching.length,
      percentage: total > 0 ? `${((matching.length / total) * 100).toFixed(1)}%` : '0.0%',
      avgSatisfaction: '0.0',
    }
  })

  const avgRt = avg(rtValues)
  return {
    buckets,
    stats: {
      avg: formatDuration(avgRt),
      p50: formatDuration(percentile(rtValues, 50)),
      p90: formatDuration(percentile(rtValues, 90)),
      p99: formatDuration(percentile(rtValues, 99)),
    },
  }
}

// ═══════════════════════════════════════════
// ─── 8. Bot Performance Report ───
// ═══════════════════════════════════════════

async function getBotPerformanceReport(start: Date, end: Date) {
  const { convs, msgsByConv, responseTimes, resolutionTimes } = await fetchConvData(start, end)

  // Bot messages: count all bot messages in range
  const botMsgCount = await db.message.count({
    where: {
      senderType: 'bot',
      createdAt: { gte: start, lt: end },
    },
  })

  // Conversations with bot activity
  const botConvIds = new Set<number>()
  const agentConvIds = new Set<number>()
  for (const [convId, msgs] of msgsByConv) {
    const hasBot = msgs.some(m => m.senderType === 'bot')
    const hasAgent = msgs.some(m => m.senderType === 'agent')
    if (hasBot) botConvIds.add(convId)
    if (hasAgent) agentConvIds.add(convId)
  }

  // Handoff: conversations with both bot and agent messages
  const handoffConvIds = [...botConvIds].filter(id => agentConvIds.has(id))
  const handoffRate = botConvIds.size > 0
    ? ((handoffConvIds.length / botConvIds.size) * 100).toFixed(1) + '%'
    : '0.0%'

  // Conversations saved: bot-only conversations (no agent messages)
  const savedConvs = [...botConvIds].filter(id => !agentConvIds.has(id)).length

  // Avg resolution time for bot conversations
  const botResTimes = [...botConvIds]
    .map(id => resolutionTimes.get(id))
    .filter((v): v is number => v != null)
  const avgResTime = avg(botResTimes)

  // Accuracy: % of bot conversations that didn't need handoff
  const accuracy = botConvIds.size > 0
    ? ((savedConvs / botConvIds.size) * 100).toFixed(1) + '%'
    : '0.0%'

  return {
    metrics: [
      { metric: 'totalHandled', value: String(botMsgCount), trend: 'stable' as const },
      { metric: 'handoffRate', value: handoffRate, trend: 'stable' as const },
      { metric: 'avgResolutionTime', value: formatDuration(avgResTime), trend: 'stable' as const },
      { metric: 'customerSatisfaction', value: '0.0', trend: 'stable' as const },
      { metric: 'conversationsSaved', value: String(savedConvs), trend: 'stable' as const },
      { metric: 'accuracy', value: accuracy, trend: 'stable' as const },
    ],
  }
}

// ═══════════════════════════════════════════
// ─── 9. Tags Report ───
// ═══════════════════════════════════════════

async function getTagsReport(start: Date, end: Date) {
  // Get all tags with their conversation associations in the date range
  const convTags = await db.conversationTag.findMany({
    where: {
      conversation: { createdAt: { gte: start, lt: end } },
    },
    select: {
      id: true,
      tagId: true,
      conversationId: true,
      tag: { select: { id: true, name: true } },
      conversation: { select: { id: true, createdAt: true, updatedAt: true, status: true } },
    },
  })

  // Get response/resolution times for tagged conversations
  const taggedConvIds = [...new Set(convTags.map(ct => ct.conversationId))]
  const { responseTimes, resolutionTimes } = await fetchConvData(start, end)

  // Group by tag
  const byTag = new Map<number, {
    tagId: number; tagName: string; count: number;
    convIds: Set<number>; resTimes: number[];
  }>()

  for (const ct of convTags) {
    const existing = byTag.get(ct.tagId)
    const res = resolutionTimes.get(ct.conversationId)
    if (existing) {
      existing.count++
      existing.convIds.add(ct.conversationId)
      if (res != null) existing.resTimes.push(res)
    } else {
      const resTimes: number[] = []
      if (res != null) resTimes.push(res)
      byTag.set(ct.tagId, {
        tagId: ct.tag.id,
        tagName: ct.tag.name,
        count: 1,
        convIds: new Set([ct.conversationId]),
        resTimes,
      })
    }
  }

  return Array.from(byTag.values()).map(data => ({
    id: data.tagId,
    tag: data.tagName,
    count: data.count,
    conversations: data.convIds.size,
    avgResolution: formatDuration(avg(data.resTimes)),
    satisfaction: '0.0',
  }))
}

// ═══════════════════════════════════════════
// ─── 10. Resolution Trends Report ───
// ═══════════════════════════════════════════

async function getResolutionTrendsReport(start: Date, end: Date) {
  const { convs, resolutionTimes } = await fetchConvData(start, end)

  // Build date range array
  const dates: Date[] = []
  const cur = new Date(start)
  while (cur < end) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  // Group by date
  const byDate = new Map<string, ConvRow[]>()
  for (const c of convs) {
    const key = getDateKey(c.createdAt)
    const list = byDate.get(key) || []
    list.push(c)
    byDate.set(key, list)
  }

  // Chunk into weeks (7-day groups)
  const weeks: { period: string; total: number; resolved: number; rate: string; avgTime: string }[] = []
  for (let w = 0; w < dates.length; w += 7) {
    const weekDates = dates.slice(w, w + 7)
    if (weekDates.length === 0) continue

    const periodLabel = `${getDateKey(weekDates[0])} ~ ${getDateKey(weekDates[weekDates.length - 1])}`

    let total = 0
    let resolved = 0
    const resTimes: number[] = []

    for (const d of weekDates) {
      const dayConvs = byDate.get(getDateKey(d)) || []
      total += dayConvs.length
      for (const c of dayConvs) {
        if (c.status === 'resolved' || c.status === 'closed') resolved++
        const rt = resolutionTimes.get(c.id)
        if (rt != null) resTimes.push(rt)
      }
    }

    weeks.push({
      period: periodLabel,
      total,
      resolved,
      rate: total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0.0%',
      avgTime: formatDuration(avg(resTimes)),
    })
  }

  return weeks
}

// ═══════════════════════════════════════════
// ─── Detail Endpoints ───
// ═══════════════════════════════════════════

async function handleDetail(
  detailType: string,
  detailId: string,
  start: Date,
  end: Date,
) {
  switch (detailType) {
    case 'conversations': return getConversationDetail(detailId)
    case 'agents': return getAgentDetail(detailId, start, end)
    case 'channels': return getChannelDetail(detailId, start, end)
    case 'customers': return getCustomerDetail(detailId, start, end)
    case 'tags': return getTagDetail(detailId, start, end)
    default: return { error: 'Unknown detail type' }
  }
}

// Helper: build a conversation row for detail views
async function buildConvDetailRow(c: {
  id: number; createdAt: Date; updatedAt: Date; status: string; channel: string; customerId: number; ownerId: number | null
}) {
  const customer = await db.customer.findUnique({
    where: { id: c.customerId },
    select: { name: true },
  })
  const owner = c.ownerId
    ? await db.user.findUnique({ where: { id: c.ownerId }, select: { name: true } })
    : null

  const msgCount = await db.message.count({ where: { conversationId: c.id } })

  // Wait time (first response time)
  const msgs = await db.message.findMany({
    where: { conversationId: c.id, senderType: { in: ['customer', 'agent', 'bot'] } },
    orderBy: { createdAt: 'asc' },
    select: { senderType: true, createdAt: true },
  })
  let waitTimeMs: number | null = null
  let firstCust: Date | null = null
  for (const m of msgs) {
    if (m.senderType === 'customer') { firstCust = m.createdAt; break }
  }
  if (firstCust) {
    for (const m of msgs) {
      if ((m.senderType === 'agent' || m.senderType === 'bot') && m.createdAt > firstCust) {
        waitTimeMs = m.createdAt.getTime() - firstCust.getTime()
        break
      }
    }
  }

  // Resolution time
  let resTimeMs: number | null = null
  if (c.status === 'resolved' || c.status === 'closed') {
    resTimeMs = c.updatedAt.getTime() - c.createdAt.getTime()
  }

  return {
    id: c.id,
    customer: customer?.name || 'Unknown',
    channel: getChannelName(c.channel),
    status: c.status,
    agent: owner?.name || '-',
    messages: msgCount,
    waitTime: formatDuration(waitTimeMs || 0),
    resolutionTime: formatDuration(resTimeMs || 0),
    satisfaction: '0.0',
  }
}

// ─── Conversations Detail ───
async function getConversationDetail(dateStr: string) {
  const convStart = new Date(dateStr + 'T00:00:00')
  const convEnd = new Date(dateStr + 'T00:00:00')
  convEnd.setDate(convEnd.getDate() + 1)

  const convs = await db.conversation.findMany({
    where: { createdAt: { gte: convStart, lt: convEnd } },
    select: {
      id: true, createdAt: true, updatedAt: true, status: true,
      channel: true, customerId: true, ownerId: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = await Promise.all(convs.map(c => buildConvDetailRow(c)))
  return { type: 'conversations', date: dateStr, conversations: rows }
}

// ─── Agents Detail ───
async function getAgentDetail(agentId: string, start: Date, end: Date) {
  const numAgentId = Number(agentId)
  const agent = await db.user.findUnique({
    where: { id: numAgentId },
    select: { id: true, name: true },
  })
  if (!agent) return { error: 'Agent not found' }

  const agentConvs = await db.conversation.findMany({
    where: { ownerId: numAgentId, createdAt: { gte: start, lt: end } },
    select: {
      id: true, createdAt: true, updatedAt: true, status: true,
      channel: true, customerId: true, ownerId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const convCount = await db.conversation.count({
    where: { ownerId: numAgentId, createdAt: { gte: start, lt: end } },
  })
  const resolvedCount = await db.conversation.count({
    where: { ownerId: numAgentId, createdAt: { gte: start, lt: end }, status: 'resolved' },
  })
  const msgCount = await db.message.count({
    where: { senderId: numAgentId, senderType: 'agent', createdAt: { gte: start, lt: end } },
  })

  // Active hours
  const agentMsgs = await db.message.findMany({
    where: { senderId: numAgentId, senderType: 'agent', createdAt: { gte: start, lt: end } },
    select: { createdAt: true },
  })
  const hourSet = new Set(agentMsgs.map(m => {
    const d = m.createdAt
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
  }))

  // Avg response time
  const allConvs = await db.conversation.findMany({
    where: { ownerId: numAgentId, createdAt: { gte: start, lt: end } },
    select: { id: true },
  })
  const allConvIds = allConvs.map(c => c.id)
  const agentMsgsForRt = allConvIds.length > 0
    ? await db.message.findMany({
        where: {
          conversationId: { in: allConvIds },
          senderType: { in: ['customer', 'agent', 'bot'] },
        },
        orderBy: { createdAt: 'asc' },
        select: { conversationId: true, senderType: true, createdAt: true },
      })
    : []
  const msgsByConv = new Map<number, typeof agentMsgsForRt>()
  for (const m of agentMsgsForRt) {
    const list = msgsByConv.get(m.conversationId) || []
    list.push(m)
    msgsByConv.set(m.conversationId, list)
  }
  const rts: number[] = []
  for (const [convId, cMsgs] of msgsByConv) {
    let fc: Date | null = null
    for (const m of cMsgs) {
      if (m.senderType === 'customer') { fc = m.createdAt; break }
    }
    if (fc) {
      for (const m of cMsgs) {
        if ((m.senderType === 'agent' || m.senderType === 'bot') && m.createdAt > fc) {
          rts.push(m.createdAt.getTime() - fc.getTime())
          break
        }
      }
    }
  }

  const recentConvs = await Promise.all(
    agentConvs.map(async (c) => {
      const customer = await db.customer.findUnique({
        where: { id: c.customerId }, select: { name: true },
      })
      const msgCnt = await db.message.count({ where: { conversationId: c.id } })
      return {
        id: c.id,
        customer: customer?.name || 'Unknown',
        channel: getChannelName(c.channel),
        status: c.status,
        messages: msgCnt,
        satisfaction: '0.0',
      }
    })
  )

  return {
    type: 'agents',
    agent: {
      name: agent.name,
      conversations: convCount,
      messages: msgCount,
      avgResponseTime: formatDuration(avg(rts)),
      resolved: resolvedCount,
      satisfaction: '0.0',
      activeHours: `${hourSet.size}h`,
    },
    recentConversations: recentConvs,
  }
}

// ─── Channels Detail ───
async function getChannelDetail(channelKey: string, start: Date, end: Date) {
  // Channel stats for the full range
  const channelConvs = await db.conversation.findMany({
    where: { channel: channelKey, createdAt: { gte: start, lt: end } },
    select: {
      id: true, createdAt: true, updatedAt: true, status: true, channel: true,
    },
  })
  const convIds = channelConvs.map(c => c.id)

  const totalMsgs = convIds.length > 0
    ? await db.message.count({ where: { conversationId: { in: convIds } } })
    : 0
  const resolved = channelConvs.filter(c => c.status === 'resolved' || c.status === 'closed').length

  // Response times
  const rtMsgs = convIds.length > 0
    ? await db.message.findMany({
        where: { conversationId: { in: convIds }, senderType: { in: ['customer', 'agent', 'bot'] } },
        orderBy: { createdAt: 'asc' },
        select: { conversationId: true, senderType: true, createdAt: true },
      })
    : []
  const byC = new Map<number, typeof rtMsgs>()
  for (const m of rtMsgs) {
    if (!byC.has(m.conversationId)) byC.set(m.conversationId, [])
    byC.get(m.conversationId)!.push(m)
  }
  const rts: number[] = []
  for (const [, cMsgs] of byC) {
    let fc: Date | null = null
    for (const m of cMsgs) { if (m.senderType === 'customer') { fc = m.createdAt; break } }
    if (fc) {
      for (const m of cMsgs) {
        if ((m.senderType === 'agent' || m.senderType === 'bot') && m.createdAt > fc) {
          rts.push(m.createdAt.getTime() - fc.getTime()); break
        }
      }
    }
  }

  // Daily breakdown for last 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  const sevenDaysEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const dailyConvs = await db.conversation.findMany({
    where: { channel: channelKey, createdAt: { gte: sevenDaysAgo, lt: sevenDaysEnd } },
    select: { id: true, createdAt: true, status: true },
  })
  const dailyConvIds = dailyConvs.map(c => c.id)

  const dailyMsgCounts = dailyConvIds.length > 0
    ? await db.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: dailyConvIds } },
        _count: { id: true },
      })
    : []
  const dailyMsgMap = new Map(dailyMsgCounts.map(r => [r.conversationId, r._count.id]))

  const dailyBreakdown: { date: string; conversations: number; resolved: number; messages: number }[] = []
  const dayCur = new Date(sevenDaysAgo)
  while (dayCur < sevenDaysEnd) {
    const dayKey = getDateKey(dayCur)
    const dayConvs = dailyConvs.filter(c => getDateKey(c.createdAt) === dayKey)
    dailyBreakdown.push({
      date: dayKey,
      conversations: dayConvs.length,
      resolved: dayConvs.filter(c => c.status === 'resolved' || c.status === 'closed').length,
      messages: dayConvs.reduce((s, c) => s + (dailyMsgMap.get(c.id) || 0), 0),
    })
    dayCur.setDate(dayCur.getDate() + 1)
  }

  return {
    type: 'channels',
    channel: {
      name: getChannelName(channelKey),
      conversations: channelConvs.length,
      messages: totalMsgs,
      avgResponseTime: formatDuration(avg(rts)),
      resolutionRate: channelConvs.length > 0
        ? `${Math.round((resolved / channelConvs.length) * 100)}%`
        : '0%',
      satisfaction: '0.0',
    },
    dailyBreakdown,
  }
}

// ─── Customers Detail ───
async function getCustomerDetail(customerId: string, start: Date, end: Date) {
  const custId = Number(customerId)
  const customer = await db.customer.findUnique({
    where: { id: custId },
    select: { id: true, name: true },
  })
  if (!customer) return { error: 'Customer not found' }

  // Get ALL conversations for this customer (not just date range, for full history)
  const allConvs = await db.conversation.findMany({
    where: { customerId: custId },
    select: { id: true, createdAt: true, updatedAt: true, status: true, channel: true, ownerId: true },
    orderBy: { createdAt: 'desc' },
  })
  const allConvIds = allConvs.map(c => c.id)

  const totalMsgs = allConvIds.length > 0
    ? await db.message.count({ where: { conversationId: { in: allConvIds } } })
    : 0

  // Last active: latest message
  const latestMsg = allConvIds.length > 0
    ? await db.message.findFirst({
        where: { conversationId: { in: allConvIds } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
    : null

  // Primary channel
  const channelCounts = new Map<string, number>()
  for (const c of allConvs) {
    channelCounts.set(c.channel, (channelCounts.get(c.channel) || 0) + 1)
  }
  let primaryChannel = 'website'
  let maxCh = 0
  for (const [ch, cnt] of channelCounts) {
    if (cnt > maxCh) { maxCh = cnt; primaryChannel = ch }
  }

  // Value from leads
  const leadSum = await db.lead.aggregate({
    where: { customerId: custId },
    _sum: { value: true },
  })

  // Conversation history (limited)
  const historyConvs = allConvs.slice(0, 20)
  const historyIds = historyConvs.map(c => c.id)
  const histMsgCounts = historyIds.length > 0
    ? await db.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: historyIds } },
        _count: { id: true },
      })
    : []
  const histMsgMap = new Map(histMsgCounts.map(r => [r.conversationId, r._count.id]))

  const conversationHistory = await Promise.all(
    historyConvs.map(async (c) => {
      const owner = c.ownerId
        ? await db.user.findUnique({ where: { id: c.ownerId }, select: { name: true } })
        : null
      let resTimeMs: number | null = null
      if (c.status === 'resolved' || c.status === 'closed') {
        resTimeMs = c.updatedAt.getTime() - c.createdAt.getTime()
      }
      return {
        id: c.id,
        date: getDateKey(c.createdAt),
        channel: getChannelName(c.channel),
        status: c.status,
        agent: owner?.name || '-',
        messages: histMsgMap.get(c.id) || 0,
        resolutionTime: formatDuration(resTimeMs || 0),
      }
    })
  )

  return {
    type: 'customers',
    customer: {
      name: customer.name,
      conversations: allConvs.length,
      messages: totalMsgs,
      lastActive: latestMsg ? timeAgo(latestMsg.createdAt) : 'N/A',
      primaryChannel,
      value: formatValue(leadSum._sum.value),
    },
    conversationHistory,
  }
}

// ─── Tags Detail ───
async function getTagDetail(tagId: string, start: Date, end: Date) {
  const numTagId = Number(tagId)
  const tag = await db.tag.findUnique({
    where: { id: numTagId },
    select: { id: true, name: true },
  })
  if (!tag) return { error: 'Tag not found' }

  const convTags = await db.conversationTag.findMany({
    where: { tagId: numTagId },
    select: {
      conversation: {
        select: {
          id: true, createdAt: true, updatedAt: true, status: true,
          channel: true, customerId: true, ownerId: true,
        },
      },
    },
  })

  const conversations = await Promise.all(
    convTags.map(ct => buildConvDetailRow(ct.conversation))
  )

  return { type: 'tags', tag: tag.name, conversations }
}

// ═══════════════════════════════════════════
// ─── Main GET Handler ───
// ═══════════════════════════════════════════

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'conversations'
  const days = parseInt(searchParams.get('days') || '7')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const detailType = searchParams.get('detailType')
  const detailId = searchParams.get('detailId')

  const { start, end } = getDateRange(startDate, endDate, days)

  // Detail endpoint
  if (detailType && detailId) {
    return NextResponse.json(await handleDetail(detailType, detailId, start, end))
  }

  // Report types
  switch (type) {
    case 'conversations':
      return NextResponse.json(await getConversationsReport(start, end))
    case 'agents':
      return NextResponse.json(await getAgentsReport(start, end))
    case 'sla':
      return NextResponse.json(await getSlaReport(start, end))
    case 'channels':
      return NextResponse.json(await getChannelsReport(start, end))
    case 'customers':
      return NextResponse.json(await getCustomersReport(start, end))
    case 'messages':
      return NextResponse.json(await getMessagesReport(start, end))
    case 'responseTime':
      return NextResponse.json(await getResponseTimeReport(start, end))
    case 'botPerformance':
      return NextResponse.json(await getBotPerformanceReport(start, end))
    case 'tags':
      return NextResponse.json(await getTagsReport(start, end))
    case 'resolutionTrends':
      return NextResponse.json(await getResolutionTrendsReport(start, end))
    default:
      return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }
}
