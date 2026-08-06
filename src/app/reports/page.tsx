'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ArrowLeft, RefreshCw, Download, Loader2, CalendarIcon, ImageIcon } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'

// ─── Constants & Types ───
import {
  type ReportTab, type PresetKey, type DetailView, type TFn,
  getDateLocale, REPORT_TABS, CHART_TABS, SUMMARY_CARDS, DATE_PRESETS, BOT_METRIC_KEYS,
} from '@/lib/const/report'
import { CHANNEL_NAME_KEYS } from '@/lib/const/setting'

// ─── Shared UI ───
import { SummaryCard } from './shared'

// ─── Tab components ───
import { ConversationsTab } from './tabs/conversations-tab'
import { AgentsTab } from './tabs/agents-tab'
import { SlaTab } from './tabs/sla-tab'
import { ChannelsTab } from './tabs/channels-tab'
import { CustomersTab } from './tabs/customers-tab'
import { MessagesTab } from './tabs/messages-tab'
import { ResponseTimeTab } from './tabs/response-time-tab'
import { BotPerformanceTab } from './tabs/bot-performance-tab'
import { TagsTab } from './tabs/tags-tab'
import { ResolutionTrendsTab } from './tabs/resolution-trends-tab'

// ─── Detail components ───
import { ConversationDetail } from './details/conversation-detail'
import { AgentDetail } from './details/agent-detail'
import { ChannelDetail } from './details/channel-detail'
import { CustomerDetail } from './details/customer-detail'
import { TagDetail } from './details/tag-detail'

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

  // ─── Presets ───
  const presets = useMemo(() => DATE_PRESETS.map((p) => ({ key: p.key, label: t(p.labelKey) })), [t])

  const handlePreset = useCallback((key: PresetKey) => {
    const now = new Date()
    setPreset(key)
    setDetailView(null)
    switch (key) {
      case 'today':
        setStartDate(now); setEndDate(now); break
      case '7':
        setStartDate(subDays(now, 6)); setEndDate(now); break
      case '30':
        setStartDate(subDays(now, 29)); setEndDate(now); break
      case 'thisMonth':
        setStartDate(startOfMonth(now)); setEndDate(endOfMonth(now)); break
      case 'lastMonth': {
        const last = subMonths(now, 1)
        setStartDate(startOfMonth(last)); setEndDate(endOfMonth(last)); break
      }
      case 'custom': break
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

  // ─── Cache tracking for loaded tabs per queryParams ───
  const loadedTabsRef = useRef<Record<string, Set<string>>>({})

  // ─── Fetch ONLY active tab API on demand ───
  const fetchActiveTabData = useCallback(async (forceRefresh = false) => {
    const currentKey = queryParams
    if (!loadedTabsRef.current[currentKey] || forceRefresh) {
      loadedTabsRef.current[currentKey] = new Set()
    }
    const loadedSet = loadedTabsRef.current[currentKey]

    // Skip if active tab is already loaded and not forceRefresh
    if (!forceRefresh && loadedSet.has(activeTab)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/reports?${queryParams}&type=${activeTab}`)
      const data = await res.json()
      loadedSet.add(activeTab)

      switch (activeTab) {
        case 'conversations': setConversationsData(Array.isArray(data) ? data : []); break
        case 'agents': setAgentsData(Array.isArray(data) ? data : []); break
        case 'sla': setSlaData(Array.isArray(data) ? data : []); break
        case 'channels': setChannelsData(Array.isArray(data) ? data : []); break
        case 'customers': setCustomersData(Array.isArray(data) ? data : []); break
        case 'messages': if (data && data.hourly) setMessagesData(data); break
        case 'responseTime': if (data && data.buckets) setResponseTimeData(data); break
        case 'botPerformance': if (data && data.metrics) setBotPerformanceData(data); break
        case 'tags': setTagsData(Array.isArray(data) ? data : []); break
        case 'resolutionTrends': setResolutionTrendsData(Array.isArray(data) ? data : []); break
      }
    } catch (e) {
      console.error('Reports fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [queryParams, activeTab])

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

  useEffect(() => { fetchActiveTabData() }, [fetchActiveTabData])

  const handleRowClick = useCallback((type: string, id: string | number, label: string) => {
    setDetailView({ type, id, label })
    fetchDetail(type, id)
  }, [fetchDetail])

  // ─── Summary stats ───
  const totalConvs = conversationsData.length ? conversationsData.reduce((s, d) => s + (d.total || 0), 0) : null
  const totalResolved = conversationsData.length ? conversationsData.reduce((s, d) => s + (d.resolved || 0), 0) : null
  const avgSatisfaction = agentsData.length
    ? (agentsData.reduce((s: number, d: any) => s + parseFloat(d.satisfaction || 0), 0) / agentsData.length).toFixed(1)
    : null
  const slaCompliance = slaData.length
    ? (slaData.reduce((s: number, d: any) => { const n = parseInt(d.compliance); return s + (isNaN(n) ? 0 : n) }, 0) / slaData.length).toFixed(0) + '%'
    : null

  const summaryValues = useMemo(() => [
    totalConvs !== null ? totalConvs.toLocaleString() : '-',
    totalResolved !== null ? totalResolved.toLocaleString() : '-',
    conversationsData.length > 0 ? conversationsData[conversationsData.length - 1]?.avgResponseTime || '-' : '-',
    avgSatisfaction !== null ? avgSatisfaction : '-',
    slaCompliance !== null ? slaCompliance : '-',
  ], [totalConvs, totalResolved, conversationsData, avgSatisfaction, slaCompliance])

  // ─── Channel names ───
  const channelNames = useMemo(() => {
    const names: Record<string, string> = {}
    for (const [k, v] of Object.entries(CHANNEL_NAME_KEYS)) {
      names[k] = t(v)
    }
    return names
  }, [t])

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
          t('reports.conversations.col.date'), t('reports.conversations.col.total'),
          t('reports.conversations.col.open'), t('reports.conversations.col.resolved'),
          t('reports.conversations.col.closed'), t('reports.conversations.col.avgResponse'),
          t('reports.conversations.col.avgResolution'),
        ]
        const rows = conversationsData.map((r) => [r.date, r.total, r.open, r.resolved, r.closed, r.avgResponseTime, r.avgResolutionTime])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Conversations')
        sheetName = `omnichat-report-conversations-${dateRange}.xlsx`
        break
      }
      case 'agents': {
        const headers = [
          t('reports.agents.col.name'), t('reports.agents.col.conversations'),
          t('reports.agents.col.messages'), t('reports.agents.col.avgResponse'),
          t('reports.agents.col.resolved'), t('reports.agents.col.satisfaction'),
          t('reports.agents.col.activeHours'),
        ]
        const rows = agentsData.map((r) => [r.name, r.conversations, r.messages, r.avgResponseTime, r.resolved, r.satisfaction, r.activeHours])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Agents')
        sheetName = `omnichat-report-agents-${dateRange}.xlsx`
        break
      }
      case 'responseTime': {
        const headers = [
          t('reports.responseTime.col.bucket'), t('reports.responseTime.col.count'),
          t('reports.responseTime.col.percentage'), t('reports.responseTime.col.avgSatisfaction'),
        ]
        const buckets = responseTimeData?.buckets || []
        const rows = buckets.map((r: any) => [r.bucket, r.count, r.percentage, r.avgSatisfaction])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Response Time')
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
          t('reports.channels.col.channel'), t('reports.channels.col.conversations'),
          t('reports.channels.col.messages'), t('reports.channels.col.avgResponse'),
          t('reports.channels.col.resolution'), t('reports.channels.col.satisfaction'),
        ]
        const rows = channelsData.map((r) => [r.channel, r.conversations, r.messages, r.avgResponseTime, r.resolutionRate, r.satisfaction])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Channels')
        sheetName = `omnichat-report-channels-${dateRange}.xlsx`
        break
      }
      case 'customers': {
        const headers = [
          t('reports.customers.col.name'), t('reports.customers.col.conversations'),
          t('reports.customers.col.messages'), t('reports.customers.col.lastActive'),
          t('reports.customers.col.channel'), t('reports.customers.col.value'),
        ]
        const rows = customersData.map((r) => [r.name, r.conversations, r.messages, r.lastActive, r.primaryChannel, r.value])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Customers')
        sheetName = `omnichat-report-customers-${dateRange}.xlsx`
        break
      }
      case 'messages': {
        const headers = [
          t('reports.messages.col.period'), t('reports.messages.col.incoming'),
          t('reports.messages.col.outgoing'), t('reports.messages.col.total'),
        ]
        const hourly = messagesData?.hourly || []
        const rows = hourly.map((r) => [r.period, r.incoming, r.outgoing, r.total])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Messages')
        sheetName = `omnichat-report-messages-${dateRange}.xlsx`
        break
      }
      case 'sla': {
        const headers = [
          t('reports.sla.col.metric'), t('reports.sla.col.target'),
          t('reports.sla.col.actual'), t('reports.sla.col.compliance'),
        ]
        const rows = slaData.map((r) => [r.metric, r.target, r.actual, r.compliance])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'SLA')
        sheetName = `omnichat-report-sla-${dateRange}.xlsx`
        break
      }
      case 'botPerformance': {
        const headers = [
          t('reports.botPerformance.col.metric'), t('reports.botPerformance.col.value'),
          t('reports.botPerformance.col.trend'),
        ]
        const metrics = botPerformanceData?.metrics || []
        const rows = metrics.map((r: any) => [t(BOT_METRIC_KEYS[r.metric] || r.metric), r.value, r.trend])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Bot Performance')
        sheetName = `omnichat-report-botPerformance-${dateRange}.xlsx`
        break
      }
      case 'tags': {
        const headers = [
          t('reports.tags.col.tag'), t('reports.tags.col.count'),
          t('reports.tags.col.conversations'), t('reports.tags.col.avgResolution'),
          t('reports.tags.col.satisfaction'),
        ]
        const rows = tagsData.map((r) => [r.tag, r.count, r.conversations, r.avgResolution, r.satisfaction])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, 'Tags')
        sheetName = `omnichat-report-tags-${dateRange}.xlsx`
        break
      }
      case 'resolutionTrends': {
        const headers = [
          t('reports.resolutionTrends.col.period'), t('reports.resolutionTrends.col.total'),
          t('reports.resolutionTrends.col.resolved'), t('reports.resolutionTrends.col.rate'),
          t('reports.resolutionTrends.col.avgTime'),
        ]
        const rows = resolutionTrendsData.map((r) => [r.period, r.total, r.resolved, r.rate, r.avgTime])
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

  const reportTabContainerRef = useRef<HTMLDivElement>(null)

  const handleExportChartImage = useCallback(() => {
    const el = reportTabContainerRef.current
    if (!el) return
    toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 }).then((dataUrl) => {
      const link = document.createElement('a')
      const name = detailView ? detailView.type : activeTab
      link.download = `omnichat-report-${name}-${getDateRangeLabel()}.png`
      link.href = dataUrl
      link.click()
    }).catch((err) => {
      console.error('Chart image export error', err)
    })
  }, [activeTab, detailView, getDateRangeLabel])

  // ═══════════════════════════════════════════
  // ─── Tab content renderer ───
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
      case 'conversations':    return <ConversationsTab data={conversationsData} t={t} loading={loading} onRowClick={handleRowClick} />
      case 'agents':           return <AgentsTab data={agentsData} t={t} onRowClick={handleRowClick} />
      case 'sla':              return <SlaTab data={slaData} t={t} />
      case 'channels':         return <ChannelsTab data={channelsData} t={t} channelNames={channelNames} onRowClick={handleRowClick} />
      case 'customers':        return <CustomersTab data={customersData} t={t} channelNames={channelNames} onRowClick={handleRowClick} />
      case 'messages':         return <MessagesTab data={messagesData} t={t} chartRef={chartRefMessages} />
      case 'responseTime':     return <ResponseTimeTab data={responseTimeData} t={t} chartRef={chartRefResponseTime} />
      case 'botPerformance':   return <BotPerformanceTab data={botPerformanceData} t={t} />
      case 'tags':             return <TagsTab data={tagsData} t={t} onRowClick={handleRowClick} />
      case 'resolutionTrends': return <ResolutionTrendsTab data={resolutionTrendsData} t={t} chartRef={chartRefResolutionTrends} />
      default: return null
    }
  }

  // ─── Detail content renderer ───
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
      case 'conversations': return <ConversationDetail data={detailData} t={t} />
      case 'agents':        return <AgentDetail data={detailData} t={t} />
      case 'channels':      return <ChannelDetail data={detailData} t={t} />
      case 'customers':     return <CustomerDetail data={detailData} t={t} />
      case 'tags':          return <TagDetail data={detailData} t={t} />
      default: return null
    }
  }

  // ─── Tabs with translated labels ───
  const tabs = useMemo(() => REPORT_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) })), [t])

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
              onClick={() => fetchActiveTabData(true)} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{t('reports.refresh')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
              onClick={handleExportExcel} disabled={loading || !!detailView}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('reports.export')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40"
              onClick={handleExportChartImage} disabled={loading}>
              <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
              <span className="hidden sm:inline">PNG</span>
            </Button>
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

            {/* Custom date pickers */}
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
      <div ref={reportTabContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-6 bg-background">
        {detailView ? (
          renderDetailContent()
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-5">
              {SUMMARY_CARDS.map((card, i) => (
                <SummaryCard
                  key={card.labelKey}
                  label={t(card.labelKey)}
                  value={summaryValues[i]}
                  icon={card.icon}
                  gradient={card.gradient}
                />
              ))}
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