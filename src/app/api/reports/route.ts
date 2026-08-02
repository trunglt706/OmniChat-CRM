import { NextResponse } from 'next/server'

const AGENTS = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Dũng', 'Hoàng Thu Hải']
const CHANNELS = ['facebook_messenger', 'zalo', 'telegram', 'website', 'email']
const CHANNEL_NAMES: Record<string, string> = { facebook_messenger: 'Facebook Messenger', zalo: 'Zalo', telegram: 'Telegram', website: 'Website', email: 'Email' }

// Generate deterministic mock data based on seed
function seededRandom(seed: number) { let x = Math.sin(seed) * 10000; return x - Math.floor(x) }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'conversations'
  const days = parseInt(searchParams.get('days') || '7')

  if (type === 'conversations') {
    // Generate daily conversation data
    const data = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
      const total = Math.floor(seededRandom(i * 7 + 1) * 40 + 30)
      return { date: d.toISOString().split('T')[0], total, open: Math.floor(total * 0.3), resolved: Math.floor(total * 0.55), closed: Math.floor(total * 0.1), avgResponseTime: `${Math.floor(seededRandom(i * 3 + 2) * 3 + 1)}m ${Math.floor(seededRandom(i * 5 + 3) * 59)}s`, avgResolutionTime: `${Math.floor(seededRandom(i * 11 + 4) * 15 + 5)}m` }
    })
    return NextResponse.json(data)
  }

  if (type === 'agents') {
    const data = AGENTS.map((name, i) => ({
      name, conversations: Math.floor(seededRandom(i * 13 + 10) * 200 + 80), messages: Math.floor(seededRandom(i * 17 + 11) * 800 + 300), avgResponseTime: `${Math.floor(seededRandom(i * 7 + 12) * 3 + 1)}m ${Math.floor(seededRandom(i * 19 + 13) * 59)}s`, resolved: Math.floor(seededRandom(i * 23 + 14) * 150 + 50), satisfaction: (seededRandom(i * 29 + 15) * 1 + 4).toFixed(1), activeHours: `${Math.floor(seededRandom(i * 31 + 16) * 4 + 4)}h`, status: ['online', 'busy', 'away', 'online', 'online'][i]
    }))
    return NextResponse.json(data)
  }

  if (type === 'sla') {
    const data = [
      { metric: 'First Response (< 5min)', target: '< 5 min', actual: `${Math.floor(seededRandom(42) * 3 + 2)}m ${Math.floor(seededRandom(43) * 59)}s`, compliance: `${Math.floor(seededRandom(44) * 15 + 82)}%` },
      { metric: 'Resolution (< 2h)', target: '< 2h', actual: `${Math.floor(seededRandom(45) * 45 + 30)}m`, compliance: `${Math.floor(seededRandom(46) * 20 + 70)}%` },
      { metric: 'Customer Satisfaction (≥ 4.0)', target: '≥ 4.0', actual: (seededRandom(47) * 1 + 4).toFixed(1), compliance: `${Math.floor(seededRandom(48) * 15 + 80)}%` },
    ]
    return NextResponse.json(data)
  }

  if (type === 'channels') {
    const data = CHANNELS.map((ch, i) => ({ channel: CHANNEL_NAMES[ch], conversations: Math.floor(seededRandom(i * 37 + 20) * 100 + 40), messages: Math.floor(seededRandom(i * 41 + 21) * 500 + 200), avgResponseTime: `${Math.floor(seededRandom(i * 43 + 22) * 4 + 1)}m`, resolutionRate: `${Math.floor(seededRandom(i * 47 + 23) * 20 + 70)}%`, satisfaction: (seededRandom(i * 53 + 24) * 1 + 4).toFixed(1) }))
    return NextResponse.json(data)
  }

  if (type === 'customers') {
    const customers = ['Công ty ABC', 'Nguyễn Văn E', 'Trần Thị F', 'Công ty XYZ', 'Lê Minh G', 'Phạm Thị H', 'Công ty DEF', 'Hoàng Văn I', 'Ngô Thu J', 'Vũ Minh K']
    const data = customers.map((name, i) => ({ name, conversations: Math.floor(seededRandom(i * 59 + 30) * 10 + 1), messages: Math.floor(seededRandom(i * 61 + 31) * 50 + 5), lastActive: `${Math.floor(seededRandom(i * 67 + 32) * 23 + 1)}h ago`, primaryChannel: CHANNELS[i % CHANNELS.length], value: `~${Math.floor(seededRandom(i * 71 + 33) * 50 + 5)}M` }))
    return NextResponse.json(data)
  }

  if (type === 'messages') {
    // By hour
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const base = i >= 8 && i <= 18 ? 15 : 3
      const incoming = Math.floor(seededRandom(i * 73 + 40) * base + 2)
      const outgoing = Math.floor(seededRandom(i * 79 + 41) * base * 0.8 + 1)
      return { period: `${String(i).padStart(2, '0')}:00`, incoming, outgoing, total: incoming + outgoing }
    })
    const peakHour = hourlyData.reduce((max, cur) => cur.total > max.total ? cur : max, hourlyData[0]).period
    return NextResponse.json({ hourly: hourlyData, peakHour })
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
