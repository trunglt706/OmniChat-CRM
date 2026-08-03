'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { vi as dateVi, enUS as dateEn, zhCN as dateZhCN } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import {
  ArrowLeft, RefreshCw, Download, MessageSquare, CheckCircle,
  Clock, Star, Shield, Loader2, TrendingUp, CalendarIcon,
  ChevronLeft, Bot, ArrowUpRight, ArrowDownRight, Minus, Tag,
  Timer, BarChart3, Zap, ImageIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'

// ─── Types ───
type ReportTab = 'conversations' | 'agents' | 'sla' | 'channels' | 'customers' | 'messages' | 'responseTime' | 'botPerformance' | 'tags' | 'resolutionTrends'
type PresetKey = 'today' | '7' | '30' | 'thisMonth' | 'lastMonth' | 'custom'

interface DetailView {
  type: string
  id: string | number
  label: string
}

// ─── Date locale mapping ───
function getDateLocale(locale: string) {
  switch (locale) {
    case 'en': return dateEn
    case 'zh': return dateZhCN
    default: return dateVi
  }
}

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

// ─── Detail stat row ───
function DetailStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export default function ReportsPage() {
  const { t, locale } = useT()
  const dateLocale = useMemo(() => getDateLocale(locale), [locale])
  const setActiveView = useCRMStore((s) => s.setActiveView)

  // ─── Date range state ───
  const [preset, setPreset] = useState<PresetKey>('7')
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 6))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [calOpen, setCalOpen] = useState<'start' | 'end' | null>(null)

  // ─── Tab & data state ───
  const [activeTab, setActiveTab] = useState<ReportTab>('conversations')
  const [loading, setLoading] = useState(false)
  const [detailView, setDetailView] = useState<DetailView | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ─── Report data state ───
  const [conversationsData, setConversationsData] = useState<any[]>([])
  const [agentsData, setAgentsData] = useState<any[]>([])
  const [slaData, setSlaData] = useState<any[]>([])
  const [channelsData, setChannelsData] = useState<any[]>([])
  const [customersData, setCustomersData] = useState<any[]>([])
  const [messagesData, setMessagesData] = useState<{ hourly: any[]; peakHour: string } | null>(null)
  const [responseTimeData, setResponseTimeData] = useState<any>(null)
  const [botPerformanceData, setBotPerformanceData] = useState<any>(null)
  const [tagsData, setTagsData] = useState<any[]>([])
  const [resolutionTrendsData, setResolutionTrendsData] = useState<any[]>([])

  // ─── Chart container refs for image export ───
  const chartRefMessages = useRef<HTMLDivElement>(null)
  const chartRefResponseTime = useRef<HTMLDivElement>(null)
  const chartRefResolutionTrends = useRef<HTMLDivElement>(null)

  const chartTabs: ReportTab[] = ['messages', 'responseTime', 'resolutionTrends']

  // ─── Presets ───
  const presets: { key: PresetKey; label: string }[] = [
    { key: 'today', label: t('reports.today') },
    { key: '7', label: t('reports.7days') },
    { key: '30', label: t('reports.30days') },
    { key: 'thisMonth', label: t('reports.thisMonth') },
    { key: 'lastMonth', label: t('reports.lastMonth') },
    { key: 'custom', label: t('reports.custom') },
  ]

  const handlePreset = useCallback((key: PresetKey) => {
    const now = new Date()
    setPreset(key)
    setDetailView(null)
    switch (key) {
      case 'today':
        setStartDate(now)
        setEndDate(now)
        break
      case '7':
        setStartDate(subDays(now, 6))
        setEndDate(now)
        break
      case '30':
        setStartDate(subDays(now, 29))
        setEndDate(now)
        break
      case 'thisMonth':
        setStartDate(startOfMonth(now))
        setEndDate(endOfMonth(now))
        break
      case 'lastMonth': {
        const last = subMonths(now, 1)
        setStartDate(startOfMonth(last))
        setEndDate(endOfMonth(last))
        break
      }
      case 'custom':
        break
    }
  }, [])

  // ─── Build query params ───
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (startDate && endDate && preset !== '7') {
      params.set('startDate', format(startDate, 'yyyy-MM-dd'))
      params.set('endDate', format(endDate, 'yyyy-MM-dd'))
    } else if (startDate && endDate) {
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1
      params.set('days', String(dayCount))
      params.set('startDate', format(startDate, 'yyyy-MM-dd'))
      params.set('endDate', format(endDate, 'yyyy-MM-dd'))
    } else {
      params.set('days', '7')
    }
    return params.toString()
  }, [startDate, endDate, preset])

  // ─── Fetch all report data ───
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const base = `/api/reports?${queryParams}`
      const [conv, agents, sla, channels, customers, messages, rt, bot, tags, trends] = await Promise.all([
        fetch(`${base}&type=conversations`).then(r => r.json()),
        fetch(`${base}&type=agents`).then(r => r.json()),
        fetch(`${base}&type=sla`).then(r => r.json()),
        fetch(`${base}&type=channels`).then(r => r.json()),
        fetch(`${base}&type=customers`).then(r => r.json()),
        fetch(`${base}&type=messages`).then(r => r.json()),
        fetch(`${base}&type=responseTime`).then(r => r.json()),
        fetch(`${base}&type=botPerformance`).then(r => r.json()),
        fetch(`${base}&type=tags`).then(r => r.json()),
        fetch(`${base}&type=resolutionTrends`).then(r => r.json()),
      ])
      setConversationsData(Array.isArray(conv) ? conv : [])
      setAgentsData(Array.isArray(agents) ? agents : [])
      setSlaData(Array.isArray(sla) ? sla : [])
      setChannelsData(Array.isArray(channels) ? channels : [])
      setCustomersData(Array.isArray(customers) ? customers : [])
      if (messages && messages.hourly) setMessagesData(messages)
      if (rt && rt.buckets) setResponseTimeData(rt)
      if (bot && bot.metrics) setBotPerformanceData(bot)
      setTagsData(Array.isArray(tags) ? tags : [])
      setResolutionTrendsData(Array.isArray(trends) ? trends : [])
    } catch (e) {
      console.error('Reports fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  // ─── Fetch detail ───
  const fetchDetail = useCallback(async (type: string, id: string | number) => {
    setDetailLoading(true)
    try {
      const params = new URLSearchParams({ detailType: type, detailId: String(id) })
      if (startDate) params.set('startDate', format(startDate, 'yyyy-MM-dd'))
      if (endDate) params.set('endDate', format(endDate, 'yyyy-MM-dd'))
      const res = await fetch(`/api/reports?${params}`)
      const data = await res.json()
      setDetailData(data)
    } catch (e) {
      console.error('Detail fetch error', e)
    } finally {
      setDetailLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRowClick = useCallback((type: string, id: string | number, label: string) => {
    setDetailView({ type, id, label })
    fetchDetail(type, id)
  }, [fetchDetail])

  // ─── Summary stats ───
  const totalConvs = conversationsData.reduce((s, d) => s + (d.total || 0), 0)
  const totalResolved = conversationsData.reduce((s, d) => s + (d.resolved || 0), 0)
  const avgSatisfaction = agentsData.length
    ? (agentsData.reduce((s: number, d: any) => s + parseFloat(d.satisfaction || 0), 0) / agentsData.length).toFixed(1)
    : '0.0'
  const slaCompliance = slaData.length
    ? (slaData.reduce((s: number, d: any) => { const n = parseInt(d.compliance); return s + (isNaN(n) ? 0 : n) }, 0) / slaData.length).toFixed(0) + '%'
    : '0%'

  // ─── Tabs definition ───
  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: 'conversations', label: t('reports.tab.conversations'), icon: MessageSquare },
    { key: 'agents', label: t('reports.tab.agents'), icon: Star },
    { key: 'responseTime', label: t('reports.tab.responseTime'), icon: Timer },
    { key: 'channels', label: t('reports.tab.channels'), icon: BarChart3 },
    { key: 'customers', label: t('reports.tab.customers'), icon: Zap },
    { key: 'messages', label: t('reports.tab.messages'), icon: TrendingUp },
    { key: 'sla', label: t('reports.tab.sla'), icon: Shield },
    { key: 'botPerformance', label: t('reports.tab.botPerformance'), icon: Bot },
    { key: 'tags', label: t('reports.tab.tags'), icon: Tag },
    { key: 'resolutionTrends', label: t('reports.tab.resolutionTrends'), icon: CheckCircle },
  ]

  const CHANNEL_NAMES_MAP: Record<string, string> = {
    facebook_messenger: 'Facebook Messenger', zalo: 'Zalo',
    telegram: 'Telegram', website: 'Website', email: 'Email',
  }

  // ═══════════════════════════════════════════
  // ─── Export helpers ───
  // ═══════════════════════════════════════════

  const getDateRangeLabel = useCallback(() => {
    if (!startDate || !endDate) return '7d'
    return `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`
  }, [startDate, endDate])

  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new()
    const dateRange = getDateRangeLabel()
    let sheetName: string | undefined

    switch (activeTab) {
      case 'conversations': {
        const headers = [
          t('reports.conversations.col.date'),
          t('reports.conversations.col.total'),
          t('reports.conversations.col.open'),
          t('reports.conversations.col.resolved'),
          t('reports.conversations.col.closed'),
          t('reports.conversations.col.avgResponse'),
          t('reports.conversations.col.avgResolution'),
        ]
        const rows = conversationsData.map((r) => [
          r.date, r.total, r.open, r.resolved, r.closed, r.avgResponseTime, r.avgResolutionTime,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Conversations')
        sheetName = `omnichat-report-conversations-${dateRange}.xlsx`
        break
      }
      case 'agents': {
        const headers = [
          t('reports.agents.col.name'),
          t('reports.agents.col.conversations'),
          t('reports.agents.col.messages'),
          t('reports.agents.col.avgResponse'),
          t('reports.agents.col.resolved'),
          t('reports.agents.col.satisfaction'),
          t('reports.agents.col.activeHours'),
        ]
        const rows = agentsData.map((r) => [
          r.name, r.conversations, r.messages, r.avgResponseTime, r.resolved, r.satisfaction, r.activeHours,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Agents')
        sheetName = `omnichat-report-agents-${dateRange}.xlsx`
        break
      }
      case 'responseTime': {
        // Main sheet: buckets
        const headers = [
          t('reports.responseTime.col.bucket'),
          t('reports.responseTime.col.count'),
          t('reports.responseTime.col.percentage'),
          t('reports.responseTime.col.avgSatisfaction'),
        ]
        const buckets = responseTimeData?.buckets || []
        const rows = buckets.map((r: any) => [
          r.bucket, r.count, r.percentage, r.avgSatisfaction,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Response Time')
        // Second sheet: percentile stats
        if (responseTimeData?.stats) {
          const { stats } = responseTimeData
          const pHeaders = [t('reports.responseTime.avgLabel'), t('reports.responseTime.p50'), t('reports.responseTime.p90'), t('reports.responseTime.p99')]
          const pValues = [stats.avg, stats.p50, stats.p90, stats.p99]
          const ws2 = XLSX.utils.aoa_to_sheet([pHeaders, pValues])
          XLSX.utils.book_append_sheet(wb, ws2, 'Percentiles')
        }
        sheetName = `omnichat-report-responseTime-${dateRange}.xlsx`
        break
      }
      case 'channels': {
        const headers = [
          t('reports.channels.col.channel'),
          t('reports.channels.col.conversations'),
          t('reports.channels.col.messages'),
          t('reports.channels.col.avgResponse'),
          t('reports.channels.col.resolution'),
          t('reports.channels.col.satisfaction'),
        ]
        const rows = channelsData.map((r) => [
          r.channel, r.conversations, r.messages, r.avgResponseTime, r.resolutionRate, r.satisfaction,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Channels')
        sheetName = `omnichat-report-channels-${dateRange}.xlsx`
        break
      }
      case 'customers': {
        const headers = [
          t('reports.customers.col.name'),
          t('reports.customers.col.conversations'),
          t('reports.customers.col.messages'),
          t('reports.customers.col.lastActive'),
          t('reports.customers.col.channel'),
          t('reports.customers.col.value'),
        ]
        const rows = customersData.map((r) => [
          r.name, r.conversations, r.messages, r.lastActive, r.primaryChannel, r.value,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Customers')
        sheetName = `omnichat-report-customers-${dateRange}.xlsx`
        break
      }
      case 'messages': {
        const headers = [
          t('reports.messages.col.period'),
          t('reports.messages.col.incoming'),
          t('reports.messages.col.outgoing'),
          t('reports.messages.col.total'),
        ]
        const hourly = messagesData?.hourly || []
        const rows = hourly.map((r) => [
          r.period, r.incoming, r.outgoing, r.total,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Messages')
        sheetName = `omnichat-report-messages-${dateRange}.xlsx`
        break
      }
      case 'sla': {
        const headers = [
          t('reports.sla.col.metric'),
          t('reports.sla.col.target'),
          t('reports.sla.col.actual'),
          t('reports.sla.col.compliance'),
        ]
        const rows = slaData.map((r) => [
          r.metric, r.target, r.actual, r.compliance,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'SLA')
        sheetName = `omnichat-report-sla-${dateRange}.xlsx`
        break
      }
      case 'botPerformance': {
        const headers = [
          t('reports.botPerformance.col.metric'),
          t('reports.botPerformance.col.value'),
          t('reports.botPerformance.col.trend'),
        ]
        const metrics = botPerformanceData?.metrics || []
        const rows = metrics.map((r: any) => {
          const metricMap: Record<string, string> = {
            totalHandled: t('reports.botPerformance.totalHandled'),
            handoffRate: t('reports.botPerformance.handoffRate'),
            avgResolutionTime: t('reports.botPerformance.avgResolutionTime'),
            customerSatisfaction: t('reports.botPerformance.customerSatisfaction'),
            conversationsSaved: t('reports.botPerformance.conversationsSaved'),
            accuracy: t('reports.botPerformance.accuracy'),
          }
          return [metricMap[r.metric] || r.metric, r.value, r.trend]
        })
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Bot Performance')
        sheetName = `omnichat-report-botPerformance-${dateRange}.xlsx`
        break
      }
      case 'tags': {
        const headers = [
          t('reports.tags.col.tag'),
          t('reports.tags.col.count'),
          t('reports.tags.col.conversations'),
          t('reports.tags.col.avgResolution'),
          t('reports.tags.col.satisfaction'),
        ]
        const rows = tagsData.map((r) => [
          r.tag, r.count, r.conversations, r.avgResolution, r.satisfaction,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Tags')
        sheetName = `omnichat-report-tags-${dateRange}.xlsx`
        break
      }
      case 'resolutionTrends': {
        const headers = [
          t('reports.resolutionTrends.col.period'),
          t('reports.resolutionTrends.col.total'),
          t('reports.resolutionTrends.col.resolved'),
          t('reports.resolutionTrends.col.rate'),
          t('reports.resolutionTrends.col.avgTime'),
        ]
        const rows = resolutionTrendsData.map((r) => [
          r.period, r.total, r.resolved, r.rate, r.avgTime,
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Resolution Trends')
        sheetName = `omnichat-report-resolutionTrends-${dateRange}.xlsx`
        break
      }
    }

    if (sheetName) {
      XLSX.writeFile(wb, sheetName)
    }
  }, [activeTab, t, getDateRangeLabel, conversationsData, agentsData, responseTimeData, channelsData, customersData, messagesData, slaData, botPerformanceData, tagsData, resolutionTrendsData])

  const handleExportChartImage = useCallback(() => {
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      messages: chartRefMessages,
      responseTime: chartRefResponseTime,
      resolutionTrends: chartRefResolutionTrends,
    }
    const el = refMap[activeTab]?.current
    if (!el) return
    toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 }).then((dataUrl) => {
      const link = document.createElement('a')
      link.download = `omnichat-chart-${activeTab}-${getDateRangeLabel()}.png`
      link.href = dataUrl
      link.click()
    }).catch((err) => {
      console.error('Chart image export error', err)
    })
  }, [activeTab, getDateRangeLabel])

  // ═══════════════════════════════════════════
  // ─── Tab renderers ───
  // ═══════════════════════════════════════════

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
              <TableRow
                key={i}
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => handleRowClick('conversations', row.date, row.date)}
              >
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
              <TableRow
                key={i}
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => handleRowClick('agents', row.id, row.name)}
              >
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
              <TableRow
                key={i}
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => handleRowClick('channels', row.id, row.channel)}
              >
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

  const renderCustomersTable = () => (
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
              <TableRow
                key={i}
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => handleRowClick('customers', row.id, row.name)}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.lastActive}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">{CHANNEL_NAMES_MAP[row.primaryChannel] || row.primaryChannel}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const renderMessagesTab = () => (
    <div className="space-y-4">
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
      <div id="chart-messages" ref={chartRefMessages} className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-4">{t('reports.messages.byHour')}</p>
        {messagesData && messagesData.hourly && (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesData.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="incoming" name={t('reports.messages.col.incoming')} fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outgoing" name={t('reports.messages.col.outgoing')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
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

  // ─── Response Time Distribution ───
  const renderResponseTimeTab = () => {
    if (!responseTimeData) return null
    const { buckets, stats } = responseTimeData
    return (
      <div className="space-y-4">
        {/* Percentile stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('reports.responseTime.avgLabel'), value: stats.avg, color: 'from-blue-500 to-cyan-500' },
            { label: t('reports.responseTime.p50'), value: stats.p50, color: 'from-emerald-500 to-teal-500' },
            { label: t('reports.responseTime.p90'), value: stats.p90, color: 'from-amber-500 to-orange-500' },
            { label: t('reports.responseTime.p99'), value: stats.p99, color: 'from-rose-500 to-pink-500' },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              <p className="text-sm font-bold mt-1 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div id="chart-responseTime" ref={chartRefResponseTime} className="glass-card rounded-2xl p-4 md:p-5">
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)' }} />
                <Bar dataKey="count" name={t('reports.responseTime.col.count')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Table */}
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">{t('reports.responseTime.col.bucket')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.count')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.percentage')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.avgSatisfaction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((row: any, i: number) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-medium">{row.bucket}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.percentage}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={cn(
                        'font-semibold',
                        parseFloat(row.avgSatisfaction) >= 4.5 ? 'text-emerald-500' : parseFloat(row.avgSatisfaction) >= 4.0 ? 'text-amber-500' : 'text-rose-500'
                      )}>
                        {row.avgSatisfaction} ★
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  // ─── Bot Performance ───
  const renderBotPerformanceTab = () => {
    if (!botPerformanceData) return null
    const trendIcon = (trend: string) => {
      if (trend === 'up') return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
      if (trend === 'down') return <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
      return <Minus className="h-3.5 w-3.5 text-amber-500" />
    }
    const metricLabel = (key: string) => {
      const map: Record<string, string> = {
        totalHandled: t('reports.botPerformance.totalHandled'),
        handoffRate: t('reports.botPerformance.handoffRate'),
        avgResolutionTime: t('reports.botPerformance.avgResolutionTime'),
        customerSatisfaction: t('reports.botPerformance.customerSatisfaction'),
        conversationsSaved: t('reports.botPerformance.conversationsSaved'),
        accuracy: t('reports.botPerformance.accuracy'),
      }
      return map[key] || key
    }
    return (
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.botPerformance.col.metric')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.botPerformance.col.value')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.botPerformance.col.trend')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {botPerformanceData.metrics.map((row: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{metricLabel(row.metric)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.value}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {trendIcon(row.trend)}
                      <span className="text-[10px] text-muted-foreground">{t(`reports.botPerformance.trend.${row.trend}`)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // ─── Tags Analysis ───
  const renderTagsTable = () => (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.tags.col.tag')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.count')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.conversations')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.avgResolution')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.satisfaction')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tagsData.map((row, i) => (
              <TableRow
                key={i}
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => handleRowClick('tags', row.id, row.tag)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-violet-500" />
                    {row.tag}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{row.conversations}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResolution}</TableCell>
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

  // ─── Resolution Trends ───
  const renderResolutionTrendsTab = () => (
    <div className="space-y-4">
      <div id="chart-resolutionTrends" ref={chartRefResolutionTrends} className="glass-card rounded-2xl p-4 md:p-5">
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={resolutionTrendsData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" name={t('reports.resolutionTrends.col.total')} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved" name={t('reports.resolutionTrends.col.resolved')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.resolutionTrends.col.period')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.total')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.resolved')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.rate')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.avgTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolutionTrendsData.map((row, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium font-mono text-[11px]">{row.period}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.resolved}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-1.5 font-mono font-semibold',
                      parseFloat(row.rate) >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                        : parseFloat(row.rate) >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                    )}>
                      {row.rate}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════
  // ─── Detail view renderer ───
  // ═══════════════════════════════════════════

  const renderConversationDetail = () => {
    if (!detailData) return null
    return (
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.id')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.customer')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.agent')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.waitTime')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.resolutionTime')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.satisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detailData.conversations || []).map((c: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.customer}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-1.5',
                      c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : c.status === 'open' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-500/10 text-gray-500'
                    )}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.agent}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.waitTime}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.resolutionTime}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={cn(
                      'font-semibold',
                      parseFloat(c.satisfaction) >= 4.5 ? 'text-emerald-500' : parseFloat(c.satisfaction) >= 4.0 ? 'text-amber-500' : 'text-rose-500'
                    )}>{c.satisfaction} ★</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const renderAgentDetail = () => {
    if (!detailData) return null
    const { agent, recentConversations } = detailData
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-sm font-bold mb-3">{t('reports.detail.agent', { name: agent.name })}</p>
          <DetailStatRow label={t('reports.detail.agent.totalConvos')} value={String(agent.conversations)} />
          <DetailStatRow label={t('reports.detail.agent.totalMessages')} value={String(agent.messages)} />
          <DetailStatRow label={t('reports.detail.agent.avgResponseTime')} value={agent.avgResponseTime} />
          <DetailStatRow label={t('reports.detail.agent.resolvedCount')} value={String(agent.resolved)} />
          <DetailStatRow label={t('reports.detail.agent.satisfaction')} value={`${agent.satisfaction} ★`} />
          <DetailStatRow label={t('reports.detail.agent.activeHours')} value={agent.activeHours} />
        </div>
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.detail.agent.recentConversations')}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">ID</TableHead>
                  <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.customer')}</TableHead>
                  <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                  <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.satisfaction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentConversations || []).map((c: any, i: number) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.customer}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={cn(
                        'text-[10px] h-5 px-1.5',
                        c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : c.status === 'open' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-500/10 text-gray-500'
                      )}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{c.satisfaction} ★</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  const renderChannelDetail = () => {
    if (!detailData) return null
    const { channel, dailyBreakdown } = detailData
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-sm font-bold mb-3">{t('reports.detail.channel', { name: channel.name })}</p>
          <DetailStatRow label={t('reports.detail.channel.totalConvos')} value={String(channel.conversations)} />
          <DetailStatRow label={t('reports.detail.channel.totalMessages')} value={String(channel.messages)} />
          <DetailStatRow label={t('reports.detail.channel.avgResponseTime')} value={channel.avgResponseTime} />
          <DetailStatRow label={t('reports.detail.channel.resolutionRate')} value={channel.resolutionRate} />
          <DetailStatRow label={t('reports.detail.channel.satisfaction')} value={`${channel.satisfaction} ★`} />
        </div>
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.detail.channel.dailyBreakdown')}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.total')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.resolved')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.messages')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dailyBreakdown || []).map((d: any, i: number) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-medium">{d.date}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{d.conversations}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{d.resolved}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.messages}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  const renderCustomerDetail = () => {
    if (!detailData) return null
    const { customer, conversationHistory } = detailData
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-sm font-bold mb-3">{t('reports.detail.customer', { name: customer.name })}</p>
          <DetailStatRow label={t('reports.detail.customer.totalConvos')} value={String(customer.conversations)} />
          <DetailStatRow label={t('reports.detail.customer.totalMessages')} value={String(customer.messages)} />
          <DetailStatRow label={t('reports.detail.customer.lastActive')} value={customer.lastActive} />
          <DetailStatRow label={t('reports.detail.customer.primaryChannel')} value={customer.primaryChannel} />
          <DetailStatRow label={t('reports.detail.customer.value')} value={customer.value} />
        </div>
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.detail.customer.conversationHistory')}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">ID</TableHead>
                  <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
                  <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                  <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                  <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.agent')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                  <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.resolutionTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(conversationHistory || []).map((c: any, i: number) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.date}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={cn(
                        'text-[10px] h-5 px-1.5',
                        c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : c.status === 'open' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-500/10 text-gray-500'
                      )}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.agent}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{c.resolutionTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  const renderTagDetail = () => {
    if (!detailData) return null
    return (
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-sm font-bold mb-3">{t('reports.tags.detail.title', { tag: detailData.tag })}</p>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">ID</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.customer')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.agent')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.resolutionTime')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.satisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detailData.conversations || []).map((c: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.customer}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-1.5',
                      c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : c.status === 'open' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-500/10 text-gray-500'
                    )}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.agent}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.resolutionTime}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{c.satisfaction} ★</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const renderDetailContent = () => {
    if (detailLoading) {
      return (
        <div className="glass-card rounded-2xl p-4 md:p-5">
          <div className="skeleton-line h-4 w-40 mb-4" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton-line h-3 w-16 flex-shrink-0" />
                <div className="skeleton-line h-3 w-10 flex-shrink-0" />
                <div className="flex-1" />
                <div className="skeleton-line h-3 w-12 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )
    }
    switch (detailView?.type) {
      case 'conversations': return renderConversationDetail()
      case 'agents': return renderAgentDetail()
      case 'channels': return renderChannelDetail()
      case 'customers': return renderCustomerDetail()
      case 'tags': return renderTagDetail()
      default: return null
    }
  }

  // ═══════════════════════════════════════════
  // ─── Main content switch ───
  // ═══════════════════════════════════════════

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 md:p-5">
            <div className="space-y-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="skeleton-line h-3 w-20 flex-shrink-0" />
                  <div className="skeleton-line h-3 w-12 flex-shrink-0" />
                  <div className="skeleton-line h-3 w-14 flex-shrink-0" />
                  <div className="skeleton-line h-3 w-16 flex-shrink-0" />
                  <div className="flex-1" />
                  <div className="skeleton-line h-3 w-14 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
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
      case 'responseTime': return renderResponseTimeTab()
      case 'botPerformance': return renderBotPerformanceTab()
      case 'tags': return renderTagsTable()
      case 'resolutionTrends': return renderResolutionTrendsTab()
      default: return null
    }
  }

  return (
    <div className="h-dvh h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl flex-shrink-0"
              onClick={() => detailView ? setDetailView(null) : setActiveView('dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
                {detailView ? t('reports.detail.title') + ': ' + detailView.label : t('reports.title')}
              </h1>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">{t('reports.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
              onClick={fetchAll} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{t('reports.refresh')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
              onClick={handleExportExcel} disabled={loading || !!detailView}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('reports.export')}</span>
            </Button>
            {!detailView && chartTabs.includes(activeTab) && (
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
                onClick={handleExportChartImage}>
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('reports.exportChart') || 'PNG'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Date Range Picker */}
        {!detailView && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Presets */}
            <div className="flex items-center gap-1 p-0.5 bg-foreground/[0.03] rounded-lg overflow-x-auto scrollbar-none">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p.key)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 whitespace-nowrap',
                    preset === p.key
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm'
                      : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.03]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date pickers (always visible) */}
            <div className="flex items-center gap-1.5">
              <Popover open={calOpen === 'start'} onOpenChange={(open) => setCalOpen(open ? 'start' : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"
                    className={cn('h-8 rounded-lg text-[11px] gap-1.5 border-border/40 min-w-[130px] justify-start', preset === 'custom' && 'border-violet-500/50 bg-violet-500/5')}>
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: dateLocale }) : t('reports.startDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); setPreset('custom') }}
                    disabled={{ after: endDate || new Date() }}
                    defaultMonth={startDate || new Date()}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-[11px] text-muted-foreground">→</span>

              <Popover open={calOpen === 'end'} onOpenChange={(open) => setCalOpen(open ? 'end' : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"
                    className={cn('h-8 rounded-lg text-[11px] gap-1.5 border-border/40 min-w-[130px] justify-start', preset === 'custom' && 'border-violet-500/50 bg-violet-500/5')}>
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: dateLocale }) : t('reports.endDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setPreset('custom') }}
                    disabled={{ before: startDate, after: new Date() }}
                    defaultMonth={endDate || new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-6">
        {detailView ? (
          renderDetailContent()
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-5">
              <SummaryCard label={t('reports.summary.conversations')} value={totalConvs.toLocaleString()} icon={MessageSquare} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
              <SummaryCard label={t('reports.summary.resolved')} value={totalResolved.toLocaleString()} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
              <SummaryCard label={t('reports.summary.avgResponse')} value={conversationsData.length > 0 ? conversationsData[conversationsData.length - 1]?.avgResponseTime || '-' : '-'} icon={Clock} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
              <SummaryCard label={t('reports.summary.satisfaction')} value={avgSatisfaction} icon={Star} gradient="bg-gradient-to-br from-rose-500 to-pink-600" />
              <SummaryCard label={t('reports.summary.slaCompliance')} value={slaCompliance} icon={Shield} gradient="bg-gradient-to-br from-cyan-500 to-blue-600" />
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 p-1 bg-foreground/[0.03] rounded-xl mb-5 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setDetailView(null) }}
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
                  <tab.icon className={cn('relative z-10 h-3.5 w-3.5', activeTab !== tab.key && 'opacity-50')} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            {renderTabContent()}
          </>
        )}
      </div>
    </div>
  )
}
