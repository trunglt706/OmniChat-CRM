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

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6', 'avatar-gradient-7', 'avatar-gradient-8']

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
        'convo-item w-full text-left px-4 py-3.5 flex gap-3 relative stagger-item group',
        isSelected && 'active'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
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
        <div
          className="absolute -bottom-0.5 -right-0.5 h-[18px] min-w-[18px] rounded-full border-[2.5px] border-background flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: chCfg?.color || '#6b7280' }}
        >
          <span className="text-[7px] text-white font-bold leading-none">{getChannelLetter(convo.channel)}</span>
        </div>
        {sla === 'breached' && (
          <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-background" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-[13px] truncate transition-colors duration-200',
            unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/80 group-hover:text-foreground'
          )}>{convo.customer.name}</span>
          <span className={cn(
            'text-[11px] flex-shrink-0 tabular-nums transition-colors duration-200',
            unread > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/60'
          )}>{formatTime(convo.updatedAt)}</span>
        </div>
        {convo.subject && (
          <p className="text-[12px] text-foreground/50 truncate mt-0.5 leading-tight group-hover:text-foreground/65 transition-colors duration-200">{convo.subject}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          {convo.owner && (
            <span className="text-[10px] text-muted-foreground/70 bg-foreground/[0.04] px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm">
              {convo.owner.name.split(' ').slice(-1)[0]}
            </span>
          )}
          {convo.priority !== 'medium' && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-all duration-200',
              convo.priority === 'urgent' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 badge-glow-red' :
              convo.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 badge-glow-amber' :
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
        <span className={cn(
          'absolute right-3 top-4 min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg transition-all duration-300',
          'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30 badge-glow-indigo'
        )}>
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
          <div className="animate-slide-down" style={{ animationDelay: '50ms' }}>
            <h2 className="text-sm font-bold tracking-tight">Hội thoại</h2>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">{totalConversations} cuộc trò chuyện</p>
          </div>
          {simulationRunning && (
            <span className="sim-live flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full shadow-sm shadow-emerald-500/10 animate-scale-bounce">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              </span>
              LIVE
            </span>
          )}
        </div>
        {/* Search */}
        <div className="relative mb-3 animate-slide-down" style={{ animationDelay: '100ms' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <Input
            placeholder="Tìm tên, SĐT, email..."
            className="pl-9 h-9 text-[13px] rounded-xl glass-input focus-visible:ring-0 focus-visible:border-primary/30"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/* Status tabs */}
        <div className="flex gap-1 animate-slide-down" style={{ animationDelay: '150ms' }}>
          {FILTER_TABS.map((tab, idx) => {
            const Icon = tab.icon
            const active = activeFilter === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-250',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]'
                )} style={{ transitionDelay: `${idx * 20}ms` }}>
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      {/* Channels */}
      <div className="px-4 py-2 border-b border-border/30 flex gap-1 overflow-x-auto animate-slide-down" style={{ animationDelay: '200ms' }}>
        {CHANNEL_FILTERS.map((ch) => {
          const active = activeChannel === ch.key
          return (
            <button key={ch.key} onClick={() => setActiveChannel(ch.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all duration-250',
                active
                  ? 'bg-foreground/[0.07] text-foreground shadow-sm scale-[1.02]'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]'
              )}>
              {ch.key !== 'all' && <span className={cn(
                'h-1.5 w-1.5 rounded-full transition-all duration-300',
                active && 'shadow-sm'
              )} style={{ backgroundColor: ch.color, boxShadow: active ? `0 0 6px ${ch.color}40` : 'none' }} />}
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
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 animate-fade-in">
            <div className="empty-state-icon h-16 w-16 rounded-2xl flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold">Không có hội thoại nào</p>
            <p className="text-xs mt-1 text-muted-foreground/40">Cuộc trò chuyện mới sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          conversations.map((convo, i) => <ConversationItem key={convo.id} convo={convo} index={i} />)
        )}
      </ScrollArea>
    </div>
  )
}