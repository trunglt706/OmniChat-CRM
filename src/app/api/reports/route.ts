import { NextResponse } from 'next/server'

const AGENTS = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Dũng', 'Hoàng Thu Hải']
const CHANNELS = ['facebook_messenger', 'zalo', 'telegram', 'website', 'email']
const CHANNEL_NAMES: Record<string, string> = { facebook_messenger: 'Facebook Messenger', zalo: 'Zalo', telegram: 'Telegram', website: 'Website', email: 'Email' }
const CUSTOMERS = ['Công ty ABC', 'Nguyễn Văn E', 'Trần Thị F', 'Công ty XYZ', 'Lê Minh G', 'Phạm Thị H', 'Công ty DEF', 'Hoàng Văn I', 'Ngô Thu J', 'Vũ Minh K']
const TAGS = ['hỗ trợ', 'than phiền', 'đặt hàng', 'thanh toán', 'giao hàng', 'hoàn trả', 'thông tin', 'khác']
const STATUSES = ['open', 'resolved', 'closed']

function seededRandom(seed: number) { let x = Math.sin(seed) * 10000; return x - Math.floor(x) }

function getDayCount(startDate: string | null, endDate: string | null, fallback: number): number {
  if (startDate && endDate) {
    return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
  }
  return fallback
}

function generateDateRange(startDate: string | null, endDate: string | null, days: number): Date[] {
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate ? new Date(startDate) : new Date(end)
  if (!startDate) start.setDate(start.getDate() - (days - 1))
  const result: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    result.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'conversations'
  const days = parseInt(searchParams.get('days') || '7')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const detailType = searchParams.get('detailType')
  const detailId = searchParams.get('detailId')

  const dateRange = generateDateRange(startDate, endDate, days)
  const dayCount = dateRange.length

  // ─── Detail endpoint ───
  if (detailType && detailId) {
    return NextResponse.json(generateDetail(detailType, detailId, dayCount))
  }

  // ─── Report types ───
  switch (type) {
    case 'conversations': return NextResponse.json(generateConversations(dateRange, dayCount))
    case 'agents': return NextResponse.json(generateAgents(dayCount))
    case 'sla': return NextResponse.json(generateSla())
    case 'channels': return NextResponse.json(generateChannels(dayCount))
    case 'customers': return NextResponse.json(generateCustomers(dayCount))
    case 'messages': return NextResponse.json(generateMessages())
    case 'responseTime': return NextResponse.json(generateResponseTime(dayCount))
    case 'botPerformance': return NextResponse.json(generateBotPerformance())
    case 'tags': return NextResponse.json(generateTags(dayCount))
    case 'resolutionTrends': return NextResponse.json(generateResolutionTrends(dateRange, dayCount))
    default: return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }
}

// ─── Data generators ───

function generateConversations(dates: Date[], dayCount: number) {
  return dates.map((d, i) => {
    const total = Math.floor(seededRandom(i * 7 + 1) * 40 + 30)
    return {
      date: d.toISOString().split('T')[0],
      total,
      open: Math.floor(total * 0.3),
      resolved: Math.floor(total * 0.55),
      closed: Math.floor(total * 0.1),
      avgResponseTime: `${Math.floor(seededRandom(i * 3 + 2) * 3 + 1)}m ${Math.floor(seededRandom(i * 5 + 3) * 59)}s`,
      avgResolutionTime: `${Math.floor(seededRandom(i * 11 + 4) * 15 + 5)}m`,
    }
  })
}

function generateAgents(dayCount: number) {
  return AGENTS.map((name, i) => ({
    id: i,
    name,
    conversations: Math.floor(seededRandom(i * 13 + 10) * 200 + 80),
    messages: Math.floor(seededRandom(i * 17 + 11) * 800 + 300),
    avgResponseTime: `${Math.floor(seededRandom(i * 7 + 12) * 3 + 1)}m ${Math.floor(seededRandom(i * 19 + 13) * 59)}s`,
    resolved: Math.floor(seededRandom(i * 23 + 14) * 150 + 50),
    satisfaction: (seededRandom(i * 29 + 15) * 1 + 4).toFixed(1),
    activeHours: `${Math.floor(seededRandom(i * 31 + 16) * 4 + 4)}h`,
    status: ['online', 'busy', 'away', 'online', 'online'][i],
  }))
}

function generateSla() {
  return [
    { metric: 'First Response (< 5min)', target: '< 5 min', actual: `${Math.floor(seededRandom(42) * 3 + 2)}m ${Math.floor(seededRandom(43) * 59)}s`, compliance: `${Math.floor(seededRandom(44) * 15 + 82)}%` },
    { metric: 'Resolution (< 2h)', target: '< 2h', actual: `${Math.floor(seededRandom(45) * 45 + 30)}m`, compliance: `${Math.floor(seededRandom(46) * 20 + 70)}%` },
    { metric: 'Customer Satisfaction (≥ 4.0)', target: '≥ 4.0', actual: (seededRandom(47) * 1 + 4).toFixed(1), compliance: `${Math.floor(seededRandom(48) * 15 + 80)}%` },
  ]
}

function generateChannels(dayCount: number) {
  return CHANNELS.map((ch, i) => ({
    id: i,
    key: ch,
    channel: CHANNEL_NAMES[ch],
    conversations: Math.floor(seededRandom(i * 37 + 20) * 100 + 40),
    messages: Math.floor(seededRandom(i * 41 + 21) * 500 + 200),
    avgResponseTime: `${Math.floor(seededRandom(i * 43 + 22) * 4 + 1)}m`,
    resolutionRate: `${Math.floor(seededRandom(i * 47 + 23) * 20 + 70)}%`,
    satisfaction: (seededRandom(i * 53 + 24) * 1 + 4).toFixed(1),
  }))
}

function generateCustomers(dayCount: number) {
  return CUSTOMERS.map((name, i) => ({
    id: i,
    name,
    conversations: Math.floor(seededRandom(i * 59 + 30) * 10 + 1),
    messages: Math.floor(seededRandom(i * 61 + 31) * 50 + 5),
    lastActive: `${Math.floor(seededRandom(i * 67 + 32) * 23 + 1)}h ago`,
    primaryChannel: CHANNELS[i % CHANNELS.length],
    value: `~${Math.floor(seededRandom(i * 71 + 33) * 50 + 5)}M`,
  }))
}

function generateMessages() {
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const base = i >= 8 && i <= 18 ? 15 : 3
    const incoming = Math.floor(seededRandom(i * 73 + 40) * base + 2)
    const outgoing = Math.floor(seededRandom(i * 79 + 41) * base * 0.8 + 1)
    return { period: `${String(i).padStart(2, '0')}:00`, incoming, outgoing, total: incoming + outgoing }
  })
  const peakHour = hourlyData.reduce((max, cur) => cur.total > max.total ? cur : max, hourlyData[0]).period
  return { hourly: hourlyData, peakHour }
}

function generateResponseTime(dayCount: number) {
  const buckets = [
    { bucket: '< 1 min', minSec: 0, maxSec: 60 },
    { bucket: '1-3 min', minSec: 60, maxSec: 180 },
    { bucket: '3-5 min', minSec: 180, maxSec: 300 },
    { bucket: '5-10 min', minSec: 300, maxSec: 600 },
    { bucket: '10-30 min', minSec: 600, maxSec: 1800 },
    { bucket: '> 30 min', minSec: 1800, maxSec: 99999 },
  ]
  const total = Math.floor(seededRandom(200) * 300 + 200)
  const data = buckets.map((b, i) => {
    const count = Math.floor(seededRandom(i * 91 + 50) * total * 0.35 + total * 0.02)
    return {
      ...b,
      count,
      percentage: '0',
      avgSatisfaction: (seededRandom(i * 97 + 55) * 1.5 + 3.5).toFixed(1),
    }
  })
  const sumCount = data.reduce((s, d) => s + d.count, 0)
  data.forEach(d => { d.percentage = ((d.count / sumCount) * 100).toFixed(1) + '%' })

  const avgSeconds = Math.floor(seededRandom(210) * 180 + 60)
  return {
    buckets: data,
    stats: {
      avg: `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`,
      p50: `${Math.floor(seededRandom(211) * 120 + 30)}s`,
      p90: `${Math.floor(seededRandom(212) * 300 + 120)}s`,
      p99: `${Math.floor(seededRandom(213) * 600 + 300)}s`,
    },
  }
}

function generateBotPerformance() {
  const trends = ['up', 'down', 'stable'] as const
  return {
    metrics: [
      { metric: 'totalHandled', value: `${Math.floor(seededRandom(300) * 400 + 300)}`, trend: trends[Math.floor(seededRandom(301) * 3)] },
      { metric: 'handoffRate', value: `${(seededRandom(302) * 25 + 10).toFixed(1)}%`, trend: trends[Math.floor(seededRandom(303) * 3)] },
      { metric: 'avgResolutionTime', value: `${Math.floor(seededRandom(304) * 5 + 1)}m ${Math.floor(seededRandom(305) * 59)}s`, trend: trends[Math.floor(seededRandom(306) * 3)] },
      { metric: 'customerSatisfaction', value: (seededRandom(307) * 0.8 + 4.0).toFixed(1), trend: trends[Math.floor(seededRandom(308) * 3)] },
      { metric: 'conversationsSaved', value: `${Math.floor(seededRandom(309) * 200 + 100)}`, trend: trends[Math.floor(seededRandom(310) * 3)] },
      { metric: 'accuracy', value: `${(seededRandom(311) * 15 + 80).toFixed(1)}%`, trend: trends[Math.floor(seededRandom(312) * 3)] },
    ]
  }
}

function generateTags(dayCount: number) {
  return TAGS.map((tag, i) => ({
    id: i,
    tag,
    count: Math.floor(seededRandom(i * 313 + 60) * 80 + 10),
    conversations: Math.floor(seededRandom(i * 317 + 61) * 40 + 5),
    avgResolution: `${Math.floor(seededRandom(i * 319 + 62) * 20 + 5)}m`,
    satisfaction: (seededRandom(i * 323 + 63) * 1 + 4).toFixed(1),
  }))
}

function generateResolutionTrends(dates: Date[], dayCount: number) {
  // Group by week
  const weeks: { period: string; total: number; resolved: number; rate: string; avgTime: string }[] = []
  for (let w = 0; w < Math.ceil(dayCount / 7); w++) {
    const weekDates = dates.slice(w * 7, (w + 1) * 7)
    const periodLabel = weekDates.length > 0
      ? `${weekDates[0].toISOString().split('T')[0]} ~ ${weekDates[weekDates.length - 1].toISOString().split('T')[0]}`
      : `Week ${w + 1}`
    const total = Math.floor(seededRandom(w * 333 + 70) * 200 + 100)
    const resolved = Math.floor(total * (seededRandom(w * 337 + 71) * 0.3 + 0.55))
    weeks.push({
      period: periodLabel,
      total,
      resolved,
      rate: ((resolved / total) * 100).toFixed(1) + '%',
      avgTime: `${Math.floor(seededRandom(w * 339 + 72) * 20 + 10)}m`,
    })
  }
  return weeks
}

// ─── Detail generators ───

function generateDetail(detailType: string, detailId: string, dayCount: number) {
  const id = parseInt(detailId)

  if (detailType === 'conversations') {
    // detailId = date string → list of conversations for that date
    const count = Math.floor(seededRandom(detailId.length * 7 + 500) * 15 + 10)
    const convos = Array.from({ length: count }, (_, i) => {
      const custIdx = i % CUSTOMERS.length
      const agentIdx = i % AGENTS.length
      const chIdx = i % CHANNELS.length
      return {
        id: `CONV-${detailId.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        customer: CUSTOMERS[custIdx],
        channel: CHANNEL_NAMES[CHANNELS[chIdx]],
        status: STATUSES[i % 3],
        agent: AGENTS[agentIdx],
        messages: Math.floor(seededRandom(i * 401 + 80) * 20 + 3),
        waitTime: `${Math.floor(seededRandom(i * 403 + 81) * 4)}m ${Math.floor(seededRandom(i * 407 + 82) * 59)}s`,
        resolutionTime: `${Math.floor(seededRandom(i * 409 + 83) * 25 + 5)}m`,
        satisfaction: (seededRandom(i * 411 + 84) * 1.5 + 3.5).toFixed(1),
      }
    })
    return { type: 'conversations', date: detailId, conversations: convos }
  }

  if (detailType === 'agents') {
    const agent = AGENTS[id] || AGENTS[0]
    const recentConvos = Array.from({ length: 8 }, (_, i) => ({
      id: `CONV-${String(i + 1).padStart(4, '0')}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      channel: CHANNEL_NAMES[CHANNELS[i % CHANNELS.length]],
      status: STATUSES[i % 3],
      messages: Math.floor(seededRandom(i * 421 + 90) * 20 + 3),
      satisfaction: (seededRandom(i * 423 + 91) * 1 + 4).toFixed(1),
    }))
    return {
      type: 'agents',
      agent: {
        name: agent,
        conversations: Math.floor(seededRandom(id * 13 + 10) * 200 + 80),
        messages: Math.floor(seededRandom(id * 17 + 11) * 800 + 300),
        avgResponseTime: `${Math.floor(seededRandom(id * 7 + 12) * 3 + 1)}m ${Math.floor(seededRandom(id * 19 + 13) * 59)}s`,
        resolved: Math.floor(seededRandom(id * 23 + 14) * 150 + 50),
        satisfaction: (seededRandom(id * 29 + 15) * 1 + 4).toFixed(1),
        activeHours: `${Math.floor(seededRandom(id * 31 + 16) * 4 + 4)}h`,
      },
      recentConversations: recentConvos,
    }
  }

  if (detailType === 'channels') {
    const chKey = CHANNELS[id] || CHANNELS[0]
    const chName = CHANNEL_NAMES[chKey]
    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const total = Math.floor(seededRandom(i * 431 + 100) * 30 + 10)
      return {
        date: d.toISOString().split('T')[0],
        conversations: total,
        resolved: Math.floor(total * 0.6),
        messages: Math.floor(seededRandom(i * 433 + 101) * 150 + 30),
      }
    })
    return {
      type: 'channels',
      channel: {
        name: chName,
        conversations: Math.floor(seededRandom(id * 37 + 20) * 100 + 40),
        messages: Math.floor(seededRandom(id * 41 + 21) * 500 + 200),
        avgResponseTime: `${Math.floor(seededRandom(id * 43 + 22) * 4 + 1)}m`,
        resolutionRate: `${Math.floor(seededRandom(id * 47 + 23) * 20 + 70)}%`,
        satisfaction: (seededRandom(id * 53 + 24) * 1 + 4).toFixed(1),
      },
      dailyBreakdown,
    }
  }

  if (detailType === 'customers') {
    const custName = CUSTOMERS[id] || CUSTOMERS[0]
    const history = Array.from({ length: 6 }, (_, i) => ({
      id: `CONV-CUST-${String(i + 1).padStart(4, '0')}`,
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
      channel: CHANNEL_NAMES[CHANNELS[i % CHANNELS.length]],
      status: STATUSES[i % 3],
      agent: AGENTS[i % AGENTS.length],
      messages: Math.floor(seededRandom(i * 441 + 110) * 15 + 2),
      resolutionTime: `${Math.floor(seededRandom(i * 443 + 111) * 20 + 3)}m`,
    }))
    return {
      type: 'customers',
      customer: {
        name: custName,
        conversations: Math.floor(seededRandom(id * 59 + 30) * 10 + 1),
        messages: Math.floor(seededRandom(id * 61 + 31) * 50 + 5),
        lastActive: `${Math.floor(seededRandom(id * 67 + 32) * 23 + 1)}h ago`,
        primaryChannel: CHANNEL_NAMES[CHANNELS[id % CHANNELS.length]],
        value: `~${Math.floor(seededRandom(id * 71 + 33) * 50 + 5)}M`,
      },
      conversationHistory: history,
    }
  }

  if (detailType === 'tags') {
    const tagName = TAGS[id] || TAGS[0]
    const convos = Array.from({ length: 10 }, (_, i) => ({
      id: `CONV-TAG-${String(i + 1).padStart(4, '0')}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      channel: CHANNEL_NAMES[CHANNELS[i % CHANNELS.length]],
      status: STATUSES[i % 3],
      agent: AGENTS[i % AGENTS.length],
      messages: Math.floor(seededRandom(i * 451 + 120) * 18 + 3),
      resolutionTime: `${Math.floor(seededRandom(i * 453 + 121) * 25 + 5)}m`,
      satisfaction: (seededRandom(i * 457 + 122) * 1 + 4).toFixed(1),
    }))
    return { type: 'tags', tag: tagName, conversations: convos }
  }

  return { error: 'Unknown detail type' }
}
