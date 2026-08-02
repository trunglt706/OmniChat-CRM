'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeft, RefreshCw, Download, MessageSquare, CheckCircle,
  Clock, Star, Shield, Loader2, TrendingUp,
} from 'lucide-react'

// ─── Types ───
type ReportTab = 'conversations' | 'agents' | 'sla' | 'channels' | 'customers' | 'messages'
type DateRange = '1' | '7' | '30'

// ─── Summary stat card ───
function SummaryCard({ label, value, icon: Icon, gradient }: {
  label: string; value: string; icon: React.ElementType; gradient: string
}) {
  return (
    <div className={cn(
      'glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-all duration-300 hover:shadow-lg',
      'card-lift'
    )}>
      <div className={cn('absolute inset-0 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300', gradient)} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] md:text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold mt-1 tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={cn('h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', gradient)}>
          <Icon className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { t } = useT()
  const setActiveView = useCRMStore((s) => s.setActiveView)

  const [activeTab, setActiveTab] = useState<ReportTab>('conversations')
  const [dateRange, setDateRange] = useState<DateRange>('7')
  const [loading, setLoading] = useState(false)
  const [conversationsData, setConversationsData] = useState<any[]>([])
  const [agentsData, setAgentsData] = useState<any[]>([])
  const [slaData, setSlaData] = useState<any[]>([])
  const [channelsData, setChannelsData] = useState<any[]>([])
  const [customersData, setCustomersData] = useState<any[]>([])
  const [messagesData, setMessagesData] = useState<{ hourly: any[]; peakHour: string } | null>(null)

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'conversations', label: t('reports.tab.conversations') },
    { key: 'agents', label: t('reports.tab.agents') },
    { key: 'sla', label: t('reports.tab.sla') },
    { key: 'channels', label: t('reports.tab.channels') },
    { key: 'customers', label: t('reports.tab.customers') },
    { key: 'messages', label: t('reports.tab.messages') },
  ]

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [conv, agents, sla, channels, customers, messages] = await Promise.all([
        fetch(`/api/reports?type=conversations&days=${dateRange}`).then(r => r.json()),
        fetch('/api/reports?type=agents').then(r => r.json()),
        fetch('/api/reports?type=sla').then(r => r.json()),
        fetch('/api/reports?type=channels').then(r => r.json()),
        fetch('/api/reports?type=customers').then(r => r.json()),
        fetch('/api/reports?type=messages').then(r => r.json()),
      ])
      setConversationsData(Array.isArray(conv) ? conv : [])
      setAgentsData(Array.isArray(agents) ? agents : [])
      setSlaData(Array.isArray(sla) ? sla : [])
      setChannelsData(Array.isArray(channels) ? channels : [])
      setCustomersData(Array.isArray(customers) ? customers : [])
      if (messages && messages.hourly) setMessagesData(messages)
    } catch (e) {
      console.error('Reports fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Summary stats computed from conversations data ───
  const totalConvs = conversationsData.reduce((s, d) => s + (d.total || 0), 0)
  const totalResolved = conversationsData.reduce((s, d) => s + (d.resolved || 0), 0)
  const avgSatisfaction = agentsData.length
    ? (agentsData.reduce((s: number, d: any) => s + parseFloat(d.satisfaction || 0), 0) / agentsData.length).toFixed(1)
    : '0.0'
  const slaCompliance = slaData.length
    ? (slaData.reduce((s: number, d: any) => { const n = parseInt(d.compliance); return s + (isNaN(n) ? 0 : n) }, 0) / slaData.length).toFixed(0) + '%'
    : '0%'

  // ─── Tab renderers ───
  const renderConversationsTable = () => (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.total')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.open')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.resolved')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.closed')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.avgResponse')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.avgResolution')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversationsData.map((row, i) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="font-medium">{row.date}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">{row.open}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">{row.resolved}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.closed}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResolutionTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {conversationsData.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">{t('reports.noData')}</p>
        </div>
      )}
    </div>
  )

  const renderAgentsTable = () => (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.agents.col.name')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.conversations')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.messages')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.avgResponse')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.resolved')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.satisfaction')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.activeHours')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentsData.map((row, i) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      row.status === 'online' ? 'bg-emerald-500' : row.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                    )} />
                    {row.name}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">{row.resolved}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={cn(
                    'font-semibold',
                    parseFloat(row.satisfaction) >= 4.5 ? 'text-emerald-500' : parseFloat(row.satisfaction) >= 4.0 ? 'text-amber-500' : 'text-rose-500'
                  )}>
                    {row.satisfaction} ★
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.activeHours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const renderSlaTable = () => (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.sla.col.metric')}</TableHead>
              <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.target')}</TableHead>
              <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.actual')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.sla.col.compliance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slaData.map((row, i) => {
              const complianceNum = parseInt(row.compliance) || 0
              return (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] h-5 px-2 font-mono">{row.target}</Badge>
                  </TableCell>
                  <TableCell className="text-center tabular-nums font-medium">{row.actual}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-2 font-mono font-semibold',
                      complianceNum >= 85 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                        : complianceNum >= 70 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                    )}>
                      {row.compliance}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const renderChannelsTable = () => (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.channels.col.channel')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.conversations')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.messages')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.avgResponse')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.resolution')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.satisfaction')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channelsData.map((row, i) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="font-medium">{row.channel}</TableCell>
                <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                <TableCell className="text-right tabular-nums">{row.resolutionRate}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={cn(
                    'font-semibold',
                    parseFloat(row.satisfaction) >= 4.5 ? 'text-emerald-500' : parseFloat(row.satisfaction) >= 4.0 ? 'text-amber-500' : 'text-rose-500'
                  )}>
                    {row.satisfaction} ★
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const renderCustomersTable = () => {
    const CHANNEL_NAMES: Record<string, string> = {
      facebook_messenger: 'Facebook Messenger', zalo: 'Zalo',
      telegram: 'Telegram', website: 'Website', email: 'Email',
    }
    return (
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.customers.col.name')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.conversations')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.lastActive')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.customers.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.value')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersData.map((row, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.lastActive}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{CHANNEL_NAMES[row.primaryChannel] || row.primaryChannel}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const renderMessagesTab = () => (
    <div className="space-y-4">
      {/* Peak hour info */}
      {messagesData && (
        <div className="glass-card rounded-2xl p-4 md:p-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <TrendingUp className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">{t('reports.messages.peakHour')}</p>
            <p className="text-sm font-bold tabular-nums">{messagesData.peakHour}</p>
          </div>
        </div>
      )}
      {/* Bar chart */}
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-4">{t('reports.messages.byHour')}</p>
        {messagesData && messagesData.hourly && (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesData.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    border: '1px solid oklch(0 0 0 / 0.06)',
                    boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="incoming" name={t('reports.messages.col.incoming')} fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outgoing" name={t('reports.messages.col.outgoing')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {/* Table */}
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.messages.col.period')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.incoming')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.outgoing')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messagesData?.hourly?.map((row, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium font-mono">{row.period}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.incoming}</TableCell>
                  <TableCell className="text-right tabular-nums text-violet-600 dark:text-violet-400">{row.outgoing}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    switch (activeTab) {
      case 'conversations': return renderConversationsTable()
      case 'agents': return renderAgentsTable()
      case 'sla': return renderSlaTable()
      case 'channels': return renderChannelsTable()
      case 'customers': return renderCustomersTable()
      case 'messages': return renderMessagesTab()
      default: return null
    }
  }

  return (
    <div className="h-dvh h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl flex-shrink-0"
              onClick={() => setActiveView('dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold tracking-tight truncate">{t('reports.title')}</h1>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">{t('reports.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="h-8 w-28 md:w-36 rounded-xl text-xs border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">{t('reports.today')}</SelectItem>
                <SelectItem value="7" className="text-xs">{t('reports.7days')}</SelectItem>
                <SelectItem value="30" className="text-xs">{t('reports.30days')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
              onClick={fetchAll}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{t('reports.refresh')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('reports.export')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-5">
          <SummaryCard
            label={t('reports.summary.conversations')}
            value={totalConvs.toLocaleString()}
            icon={MessageSquare}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          />
          <SummaryCard
            label={t('reports.summary.resolved')}
            value={totalResolved.toLocaleString()}
            icon={CheckCircle}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <SummaryCard
            label={t('reports.summary.avgResponse')}
            value={conversationsData.length > 0 ? conversationsData[conversationsData.length - 1]?.avgResponseTime || '-' : '-'}
            icon={Clock}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
          <SummaryCard
            label={t('reports.summary.satisfaction')}
            value={avgSatisfaction}
            icon={Star}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          />
          <SummaryCard
            label={t('reports.summary.slaCompliance')}
            value={slaCompliance}
            icon={Shield}
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          />
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 bg-foreground/[0.03] rounded-xl mb-5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0',
                activeTab === tab.key
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.03]'
              )}
            >
              {activeTab === tab.key && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20 animate-scale-in" />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {renderTabContent()}
      </div>
    </div>
  )
}
