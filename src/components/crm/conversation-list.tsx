'use client'

import { useEffect, useCallback, useRef, useState, memo } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHANNEL_CONFIG, type Conversation } from '@/lib/types'
import {
  Search, Inbox, User, MessageSquareOff, CheckCircle, Archive, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { socket } from '@/lib/socket'
import { LOCALE_MAP } from '@/lib/const/chat'
import { formatDateOnly } from '@/lib/format-time'
import { useT } from '@/i18n/useT'
import { logger } from '@/lib/logger'

const FILTER_TABS = [
  { key: 'all', labelKey: 'convo.channel.all' as const, icon: Filter },
  { key: 'open', labelKey: 'convo.filter.open' as const, icon: Inbox },
  { key: 'unassigned', labelKey: 'convo.filter.unassigned' as const, icon: User },
  { key: 'resolved', labelKey: 'convo.filter.resolved' as const, icon: CheckCircle },
  { key: 'spam', labelKey: 'convo.filter.spam' as const, icon: MessageSquareOff },
  { key: 'archived', labelKey: 'convo.filter.archived' as const, icon: Archive },
]

const CHANNEL_FILTERS = [
  { key: 'all', labelKey: 'convo.channel.all' as const },
  { key: 'facebook_messenger', labelKey: 'convo.channel.fb' as const, color: '#1877f2' },
  // { key: 'facebook_comment', labelKey: 'convo.channel.fbc' as const, color: '#1877f2' },
  { key: 'zalo', labelKey: 'convo.channel.zalo' as const, color: '#0068ff' },
  { key: 'telegram', labelKey: 'convo.channel.tg' as const, color: '#26a5e4' },
  { key: 'chatwork', labelKey: 'convo.channel.cw' as const, color: '#ee2224' },
  // { key: 'website', labelKey: 'convo.channel.web' as const, color: '#10b981' },
  // { key: 'email', labelKey: 'convo.channel.mail' as const, color: '#ea4335' },
]

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6', 'avatar-gradient-7', 'avatar-gradient-8']

function getChannelLetter(ch: string) {
  const m: Record<string, string> = { facebook_messenger: 'M', facebook_comment: 'C', zalo: 'Z', telegram: 'T', chatwork: 'CW', website: 'W', email: 'E' }
  return m[ch] || '?'
}

function formatTime(d: string, t: (key: string, params?: Record<string, string | number>) => string, locale = 'vi') {
  const date = new Date(d), now = new Date(), diff = now.getTime() - date.getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (m < 1) return t('convo.time.justNow')
  if (m < 60) return t('convo.time.minutes', { m })
  if (h < 24) return t('convo.time.hours', { h })
  if (days < 7) return t('convo.time.days', { d: days })
  return formatDateOnly(d)
}

function getSLA(convo: Conversation) {
  if (!convo.slaFirstResponse) return null
  if (convo.status === 'resolved' || convo.status === 'closed') return 'met'
  return new Date() > new Date(convo.slaFirstResponse) ? 'breached' : 'active'
}

// ─── Memoized Conversation Item ───
interface ConvoItemProps {
  convo: Conversation
  index: number
}

const ConversationItem = memo(function ConversationItem({ convo, index }: ConvoItemProps) {
  const { t, locale } = useT()
  const selectedId = useCRMStore((s) => s.selectedConversationId)
  const setSelected = useCRMStore((s) => s.setSelectedConversationId)
  const setMobileView = useCRMStore((s) => s.setMobileView)
  const unread = useCRMStore((s) => s.unreadCounts[convo.id] || 0)
  const isSelected = selectedId === convo.id
  const sla = getSLA(convo)
  const chCfg = CHANNEL_CONFIG[convo.channel as keyof typeof CHANNEL_CONFIG]
  const gradient = GRADIENT_CLASSES[index % GRADIENT_CLASSES.length]

  const priorityLabel = convo.priority === 'urgent'
    ? t('convo.priority.urgent')
    : convo.priority === 'high'
      ? t('convo.priority.high')
      : convo.priority === 'low'
        ? t('convo.priority.low')
        : ''

  return (
    <button
      onClick={() => { setSelected(convo.id); setMobileView('chat') }}
      className={cn(
        'convo-item w-full text-left px-4 py-3.5 flex gap-3 relative group',
        isSelected && 'active'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className={cn(
          'h-11 w-11 transition-all duration-300',
          isSelected && 'avatar-ring scale-105'
        )}>
          <AvatarFallback className={cn('text-sm text-white font-semibold shadow-sm', gradient)}>
            {convo.customer.name.split(' ').slice(-2).map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-background',
          chCfg?.badgeClass || 'bg-slate-500'
        )} title={chCfg?.label || convo.channel}>
          {getChannelLetter(convo.channel)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {convo.customer.name}
          </span>
          <span className="text-[11px] text-muted-foreground/60 flex-shrink-0 font-medium">
            {formatTime(convo.updatedAt, t, locale)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/80 line-clamp-1 mb-1.5 font-normal">
          {convo.lastMessage}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {priorityLabel && (
            <Badge variant="outline" className={cn(
              'text-[10px] px-1.5 py-0 h-4 border-0 font-medium rounded-md',
              convo.priority === 'urgent' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              convo.priority === 'high' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              convo.priority === 'low' && 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
            )}>
              {priorityLabel}
            </Badge>
          )}
          {sla === 'breached' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 rounded-md animate-pulse">
              SLA
            </Badge>
          )}
          {unread > 0 && (
            <span className="ml-auto h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})

export default function ConversationList() {
  const { t } = useT()
  const activeFilter = useCRMStore((s) => s.activeFilter)
  const activeChannel = useCRMStore((s) => s.activeChannel)
  const searchQuery = useCRMStore((s) => s.searchQuery)
  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  const conversations = useCRMStore((s) => s.conversations)
  const totalConversations = useCRMStore((s) => s.totalConversations)
  const isLoadingConversations = useCRMStore((s) => s.isLoadingConversations)
  const setConversations = useCRMStore((s) => s.setConversations)
  const setTotalConversations = useCRMStore((s) => s.setTotalConversations)
  const setActiveFilter = useCRMStore((s) => s.setActiveFilter)
  const setActiveChannel = useCRMStore((s) => s.setActiveChannel)
  const setSearchQuery = useCRMStore((s) => s.setSearchQuery)
  const setIsLoadingConversations = useCRMStore((s) => s.setIsLoadingConversations)
  const storeAgents = useCRMStore((s) => s.agents)
  const setAgents = useCRMStore((s) => s.setAgents)

  // ── Fetch agents once on conversation list page load ──
  useEffect(() => {
    if (storeAgents.length === 0) {
      fetch('/api/agents')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setAgents(data)
        })
        .catch((e) => logger.error('Fetch agents error', 'ConversationList', e))
    }
  }, [storeAgents.length, setAgents])

  // ── Debounced search state ──
  const DEBOUNCE_MS = 300
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  const abortControllerRef = useRef<AbortController | null>(null)
  const inFlightUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchConversations = useCallback(async () => {
    const p = new URLSearchParams()
    if (activeFilter === 'unassigned') p.set('assigned', 'unassigned')
    else if (activeFilter !== 'all') p.set('status', activeFilter)
    if (activeChannel !== 'all') p.set('channel', activeChannel)
    if (debouncedSearch) p.set('search', debouncedSearch)
    const url = `/api/conversations?${p.toString()}`

    // Skip if identical request URL is already in flight
    if (inFlightUrlRef.current === url) return

    // Abort previous pending request if URL changed
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    inFlightUrlRef.current = url

    setIsLoadingConversations(true)
    try {
      const res = await fetch(url, { signal: controller.signal })
      const json = await res.json()
      setConversations(json.data || [])
      setTotalConversations(json.total || 0)
    } catch (e: any) {
      if (e.name !== 'AbortError') logger.error('Fetch conversations error', 'ConversationList', e)
    } finally {
      if (inFlightUrlRef.current === url) {
        inFlightUrlRef.current = null
        setIsLoadingConversations(false)
      }
    }
  }, [activeFilter, activeChannel, debouncedSearch, setConversations, setTotalConversations, setIsLoadingConversations])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Socket: listen for conversation updates (debounced to avoid flooding)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const unsub = socket.on('conversation_update', () => {
      clearTimeout(timer)
      timer = setTimeout(fetchConversations, 500)
    })
    return () => { clearTimeout(timer); unsub() }
  }, [fetchConversations])

  const handleSearch = (v: string) => {
    setSearchQuery(v)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold tracking-tight">{t('convo.title')}</h2>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">{t('convo.count', { count: totalConversations })}</p>
          </div>
          {simulationRunning && (
            <span className="sim-live flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full shadow-sm shadow-emerald-500/10 animate-scale-bounce">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              </span>
              {t('convo.live')}
            </span>
          )}
        </div>
        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <Input
            placeholder={t('convo.search')}
            className="pl-9 h-8 md:h-9 text-[13px] rounded-xl glass-input focus-visible:ring-0 focus-visible:border-primary/30"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/* Status & Channel Filters (Select inputs side-by-side) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Status Select */}
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-full h-8 md:h-9 text-xs rounded-xl glass-input border-border/30 px-3 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <SelectItem key={tab.key} value={tab.key} className="text-xs cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{t(tab.labelKey)}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Channel Select */}
          <Select value={activeChannel} onValueChange={setActiveChannel}>
            <SelectTrigger className="w-full h-8 md:h-9 text-xs rounded-xl glass-input border-border/30 px-3 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_FILTERS.map((ch) => (
                <SelectItem key={ch.key} value={ch.key} className="text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    {ch.key !== 'all' ? (
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ch.color }}
                      />
                    ) : (
                      <span className="h-2 w-2 rounded-full flex-shrink-0 bg-muted-foreground/40" />
                    )}
                    <span className="truncate">{t(ch.labelKey)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* List — native scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton-line h-11 w-11 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="skeleton-line h-3.5 w-2/3" />
                  <div className="skeleton-line h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
            <div className="empty-state-icon h-16 w-16 rounded-2xl flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold">{t('convo.empty')}</p>
            <p className="text-xs mt-1 text-muted-foreground/40">{t('convo.emptyDesc')}</p>
          </div>
        ) : (
          conversations.map((convo, i) => <ConversationItem key={convo.id} convo={convo} index={i} />)
        )}
      </div>
    </div>
  )
}