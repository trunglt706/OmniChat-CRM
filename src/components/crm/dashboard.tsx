'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import {
  MessageSquare, Users, Clock, AlertTriangle, TrendingUp, CheckCircle,
  Phone, Globe, Send, BarChart3, Zap, Target, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHANNEL_CONFIG } from '@/lib/types'
import { useT } from '@/i18n/useT'
// Native scroll

const CHANNEL_COLORS: Record<string, string> = {
  facebook_messenger: '#1877f2',
  zalo: '#0068ff',
  telegram: '#26a5e4',
  website: '#10b981',
  chatwork: '#ee2224',
  email: '#ea4335',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280']

const LEAD_STATUS_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'lead.status.new', contacted: 'lead.status.contacted', qualified: 'lead.status.qualified',
  proposal: 'lead.status.proposal', negotiation: 'lead.status.negotiation', won: 'lead.status.won', lost: 'lead.status.lost',
}

interface DashboardData {
  summary: {
    totalConversations: number
    openConversations: number
    pendingConversations: number
    resolvedToday: number
    totalMessages: number
    todayMessages: number
    totalCustomers: number
    slaBreached: number
  }
  channelDistribution: { channel: string; count: number }[]
  agentPerformance: {
    id: string; name: string; role: string; status: string
    activeConversations: number; totalMessages: number; resolvedConversations: number
  }[]
  leadFunnel: Record<string, number>
  leadBySource: Record<string, { count: number; value: number }>
  dailyTrend: { date: string; total: number; resolved: number; channels: Record<string, number> }[]
}

function StatCard({ title, value, icon: Icon, subtitle, color }: {
  title: string; value: number | string; icon: React.ElementType;
  subtitle?: string; color?: string
}) {
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-xl md:text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
            {subtitle && <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={cn('h-8 w-8 md:h-9 md:w-9 rounded-lg flex items-center justify-center flex-shrink-0', color || 'bg-primary/10')}>
            <Icon className={cn('h-4 w-4 md:h-4.5 md:w-4.5', color ? 'text-white' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { t } = useT()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const { summary, channelDistribution, agentPerformance, leadFunnel, leadBySource, dailyTrend } = data

  // Prepare chart data
  const channelData = channelDistribution.map((c) => ({
    name: CHANNEL_CONFIG[c.channel as keyof typeof CHANNEL_CONFIG]?.label || c.channel,
    value: c.count,
    color: CHANNEL_COLORS[c.channel] || '#6b7280',
  }))

  const trendData = dailyTrend.map((d) => ({
    name: new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    new: d.total - d.resolved,
    resolved: d.resolved,
  }))

  const funnelData = LEAD_STATUS_ORDER
    .filter((s) => leadFunnel[s])
    .map((s) => ({ name: t(LEAD_STATUS_LABELS[s]), value: leadFunnel[s] }))

  const sourceData = Object.entries(leadBySource).map(([source, info]) => ({
    name: source || t('dashboard.other', { count: info.count }),
    value: info.value / 1000000,
    count: info.count,
  }))

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg md:text-xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatCard title={t('dashboard.open')} value={summary.openConversations} icon={MessageSquare} subtitle={t('dashboard.pending', { count: summary.pendingConversations })} color="bg-emerald-500" />
          <StatCard title={t('dashboard.resolvedToday')} value={summary.resolvedToday} icon={CheckCircle} subtitle={t('dashboard.total', { count: summary.totalConversations })} color="bg-blue-500" />
          <StatCard title={t('dashboard.messagesToday')} value={summary.todayMessages} icon={TrendingUp} subtitle={t('dashboard.total', { count: summary.totalMessages })} color="bg-violet-500" />
          <StatCard title={t('dashboard.slaBreached')} value={summary.slaBreached} icon={AlertTriangle} subtitle={t('dashboard.customers', { count: summary.totalCustomers })} color={summary.slaBreached > 0 ? 'bg-red-500' : 'bg-slate-500'} />
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
          {/* Trend chart */}
          <Card className="lg:col-span-2 min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('dashboard.trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="new" name={t('dashboard.trend.new')} fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} />
                    <Area type="monotone" dataKey="resolved" name={t('dashboard.trend.resolved')} fill="#10b981" fillOpacity={0.15} stroke="#10b981" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Channel distribution */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('dashboard.channelDist')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 md:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channelData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {channelData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {channelData.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-1.5 text-[11px]">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                    <span className="text-muted-foreground truncate">{ch.name}</span>
                    <span className="font-medium ml-auto">{ch.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-3 md:gap-4">
          {/* Agent performance */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('dashboard.agentPerf')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile: compact card layout */}
              <div className="lg:hidden divide-y divide-border/50">
                {agentPerformance.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        agent.status === 'online' ? 'bg-emerald-500' : agent.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                      )} />
                      <span className="text-xs font-medium truncate">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0 text-[10px]">
                      <span className="text-muted-foreground">{agent.activeConversations} <span className="hidden sm:inline">{t('dashboard.agentPerf.active')}</span></span>
                      <span className="text-muted-foreground">{agent.totalMessages} {t('dashboard.agentPerf.messages')}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{agent.resolvedConversations} {t('dashboard.agentPerf.resolved')}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table layout */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('dashboard.agentPerf.agent')}</TableHead>
                      <TableHead className="text-xs text-center">{t('dashboard.agentPerf.active')}</TableHead>
                      <TableHead className="text-xs text-center">{t('dashboard.agentPerf.messages')}</TableHead>
                      <TableHead className="text-xs text-center">{t('dashboard.agentPerf.resolved')}</TableHead>
                      <TableHead className="text-xs">{t('dashboard.agentPerf.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentPerformance.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="text-xs font-medium py-2.5">{agent.name}</TableCell>
                        <TableCell className="text-xs text-center py-2.5">
                          <Badge variant={agent.activeConversations > 0 ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5">
                            {agent.activeConversations}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center py-2.5">{agent.totalMessages}</TableCell>
                        <TableCell className="text-xs text-center py-2.5">{agent.resolvedConversations}</TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              agent.status === 'online' ? 'bg-emerald-500' : agent.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                            )} />
                            <span className="text-[11px] capitalize">{agent.status}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Lead funnel + Source */}
          <div className="space-y-3 md:space-y-4 min-w-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('dashboard.leadPipeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-36 md:h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {sourceData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{t('dashboard.valueBySource')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {sourceData.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t('dashboard.leads', { count: s.count })}</span>
                          <span className="font-semibold text-xs text-emerald-600">{s.value.toFixed(0)}M</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
