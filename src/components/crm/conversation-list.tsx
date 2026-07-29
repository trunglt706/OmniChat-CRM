'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { CHANNEL_CONFIG, type Conversation } from '@/lib/types'
import {
  Search, Inbox, User, MessageSquareOff, CheckCircle, Archive,
  Globe, MessageCircle, Phone, Send, Mail, Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FILTER_TABS = [
  { key: 'open', label: 'Mở', icon: Inbox },
  { key: 'unassigned', label: 'Chưa phân', icon: User },
  { key: 'resolved', label: 'Xong', icon: CheckCircle },
  { key: 'spam', label: 'Spam', icon: MessageSquareOff },
  { key: 'archived', label: 'Lưu trữ', icon: Archive },
]

const CHANNEL_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'facebook_messenger', label: 'FB', color: '#1877f2' },
  { key: 'zalo', label: 'Zalo', color: '#0068ff' },
  { key: 'telegram', label: 'TG', color: '#26a5e4' },
  { key: 'website', label: 'Web', color: '#10b981' },
  { key: 'email', label: 'Mail', color: '#ea4335' },
]

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5']

function getChannelLetter(ch: string) {
  const m: Record<string, string> = { facebook_messenger: 'M', facebook_comment: 'C', zalo: 'Z', telegram: 'T', website: 'W', email: 'E' }
  return m[ch] || '?'
}

function formatTime(d: string) {
  const date = new Date(d), now = new Date(), diff = now.getTime() - date.getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m}p`
  if (h < 24) return `${h}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('vi-VN')
}

function getSLA(convo: Conversation) {
  if (!convo.slaFirstResponse) return null
  if (convo.status === 'resolved' || convo.status === 'closed') return 'met'
  return new Date() > new Date(convo.slaFirstResponse) ? 'breached' : 'active'
}

function ConversationItem({ convo, index }: { convo: Conversation; index: number }) {
  const selectedId = useCRMStore((s) => s.selectedConversationId)
  const setSelected = useCRMStore((s) => s.setSelectedConversationId)
  const setMobileView = useCRMStore((s) => s.setMobileView)
  const unreadCounts = useCRMStore((s) => s.unreadCounts)
  const isSelected = selectedId === convo.id
  const sla = getSLA(convo)
  const chCfg = CHANNEL_CONFIG[convo.channel as keyof typeof CHANNEL_CONFIG]
  const unread = unreadCounts[convo.id] || 0
  const gradient = GRADIENT_CLASSES[index % GRADIENT_CLASSES.length]

  return (
    <button
      onClick={() => { setSelected(convo.id); setMobileView('chat') }}
      className={cn(
        'convo-item w-full text-left px-4 py-3.5 flex gap-3 relative stagger-item',
        isSelected && 'active'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className={cn('text-sm text-white font-semibold', gradient)}>
            {convo.customer.name.split(' ').slice(-2).map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div
          className="absolute -bottom-0.5 -right-0.5 h-[18px] min-w-[18px] rounded-full border-[2.5px] border-background flex items-center justify-center shadow-sm"
          style={{ backgroundColor: chCfg?.color || '#6b7280' }}
        >
          <span className="text-[7px] text-white font-bold leading-none">{getChannelLetter(convo.channel)}</span>
        </div>
        {sla === 'breached' && (
          <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-background" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[13px] truncate', unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/90')}>{convo.customer.name}</span>
          <span className="text-[11px] text-muted-foreground/70 flex-shrink-0 tabular-nums">{formatTime(convo.updatedAt)}</span>
        </div>
        {convo.subject && (
          <p className="text-[12px] text-foreground/60 truncate mt-0.5 leading-tight">{convo.subject}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {convo.owner && (
            <span className="text-[10px] text-muted-foreground/70 bg-foreground/[0.04] px-1.5 py-0.5 rounded-md font-medium">
              {convo.owner.name.split(' ').slice(-1)[0]}
            </span>
          )}
          {convo.priority !== 'medium' && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
              convo.priority === 'urgent' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' :
              convo.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
              'bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400'
            )}>
              {convo.priority === 'urgent' ? 'Khẩn' : convo.priority === 'high' ? 'Cao' : convo.priority === 'low' ? 'Thấp' : ''}
            </span>
          )}
          {convo.tags.slice(0, 2).map((ct) => (
            <span key={ct.tag.id} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: ct.tag.color + '15', color: ct.tag.color }}>
              {ct.tag.name}
            </span>
          ))}
          {convo.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground/60 font-medium">+{convo.tags.length - 2}</span>
          )}
        </div>
      </div>
      {unread > 0 && (
        <span className="absolute right-3 top-4 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-indigo-500/25 animate-scale-in">
          {unread}
        </span>
      )}
    </button>
  )
}

export default function ConversationList() {
  const {
    conversations, setConversations, totalConversations, setTotalConversations,
    activeFilter, setActiveFilter, activeChannel, setActiveChannel,
    searchQuery, setSearchQuery, isLoadingConversations, setIsLoadingConversations,
    simulationRunning,
  } = useCRMStore()

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const p = new URLSearchParams()
      if (activeFilter === 'unassigned') p.set('assigned', 'unassigned')
      else if (activeFilter !== 'all') p.set('status', activeFilter)
      if (activeChannel !== 'all') p.set('channel', activeChannel)
      if (searchQuery) p.set('search', searchQuery)
      const res = await fetch(`/api/conversations?${p}`)
      const json = await res.json()
      setConversations(json.data || [])
      setTotalConversations(json.total || 0)
    } catch (e) { console.error(e) }
    finally { setIsLoadingConversations(false) }
  }, [activeFilter, activeChannel, searchQuery, setConversations, setTotalConversations, setIsLoadingConversations])

  useEffect(() => { fetchConversations() }, [fetchConversations])
  useEffect(() => {
    const h = () => fetchConversations()
    window.addEventListener('crm:conversation_update', h)
    window.addEventListener('crm:refresh_list', h)
    return () => { window.removeEventListener('crm:conversation_update', h); window.removeEventListener('crm:refresh_list', h) }
  }, [fetchConversations])

  const debounceRef = useRef<NodeJS.Timeout>()
  const handleSearch = (v: string) => {
    setSearchQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchConversations(), 250)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold">Hội thoại</h2>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{totalConversations} cuộc trò chuyện</p>
          </div>
          {simulationRunning && (
            <span className="sim-live flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </span>
          )}
        </div>
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Tìm tên, SĐT, email..."
            className="pl-9 h-9 text-[13px] rounded-lg bg-foreground/[0.03] border-foreground/[0.06] focus-visible:border-primary/40 focus-ring"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/* Status tabs */}
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeFilter === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
                )}>
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      {/* Channels */}
      <div className="px-4 py-2 border-b border-border/40 flex gap-1 overflow-x-auto">
        {CHANNEL_FILTERS.map((ch) => {
          const active = activeChannel === ch.key
          return (
            <button key={ch.key} onClick={() => setActiveChannel(ch.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-200',
                active
                  ? 'bg-foreground/[0.06] text-foreground shadow-sm'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.03]'
              )}>
              {ch.key !== 'all' && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ch.color }} />}
              {ch.label}
            </button>
          )
        })}
      </div>
      {/* List */}
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="skeleton-line h-11 w-11 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="skeleton-line h-3.5 w-2/3" />
                  <div className="skeleton-line h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 animate-fade-in">
            <div className="empty-state-icon h-14 w-14 rounded-2xl flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Không có hội thoại nào</p>
          </div>
        ) : (
          conversations.map((convo, i) => <ConversationItem key={convo.id} convo={convo} index={i} />)
        )}
      </ScrollArea>
    </div>
  )
}