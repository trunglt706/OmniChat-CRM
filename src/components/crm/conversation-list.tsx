'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { CHANNEL_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, type Conversation } from '@/lib/types'
import {
  Search, Inbox, User, MessageSquareOff, CheckCircle, Archive, Tag, Hash,
  Globe, MessageCircle, Phone, Send, ChevronDown, Filter
} from 'lucide-react'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const FILTER_TABS = [
  { key: 'open', label: 'Open', icon: Inbox },
  { key: 'unassigned', label: 'Unassigned', icon: User },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle },
  { key: 'spam', label: 'Spam', icon: MessageSquareOff },
  { key: 'archived', label: 'Archive', icon: Archive },
]

const CHANNEL_FILTERS = [
  { key: 'all', label: 'All Channels' },
  { key: 'facebook_messenger', label: 'Facebook', color: '#1877f2' },
  { key: 'zalo', label: 'Zalo', color: '#0068ff' },
  { key: 'telegram', label: 'Telegram', color: '#26a5e4' },
  { key: 'website', label: 'Website', color: '#10b981' },
]

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'facebook_messenger': return <MessageCircle className="h-3.5 w-3.5" />
    case 'facebook_comment': return <MessageSquareOff className="h-3.5 w-3.5" />
    case 'zalo': return <Phone className="h-3.5 w-3.5" />
    case 'telegram': return <Send className="h-3.5 w-3.5" />
    case 'website': return <Globe className="h-3.5 w-3.5" />
    default: return <Hash className="h-3.5 w-3.5" />
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes}p trước`
  if (hours < 24) return `${hours}h trước`
  if (days < 7) return `${days}d trước`
  return date.toLocaleDateString('vi-VN')
}

function getSLAStatus(convo: Conversation) {
  if (!convo.slaFirstResponse) return null
  const slaTime = new Date(convo.slaFirstResponse)
  const now = new Date()
  if (convo.status === 'resolved' || convo.status === 'closed') return 'met'
  if (now > slaTime) return 'breached'
  return 'active'
}

function ConversationItem({ convo }: { convo: Conversation }) {
  const selectedId = useCRMStore((s) => s.selectedConversationId)
  const setSelected = useCRMStore((s) => s.setSelectedConversationId)
  const isSelected = selectedId === convo.id
  const slaStatus = getSLAStatus(convo)
  const channelCfg = CHANNEL_CONFIG[convo.channel as keyof typeof CHANNEL_CONFIG]

  return (
    <button
      onClick={() => setSelected(convo.id)}
      className={cn(
        'w-full text-left p-3 border-b border-border/50 hover:bg-accent/50 transition-colors flex gap-3',
        isSelected && 'bg-accent border-l-2 border-l-primary'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm bg-muted">
            {convo.customer.name.split(' ').slice(-2).map((n) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div
          className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center"
          style={{ backgroundColor: channelCfg?.color || '#6b7280' }}
          title={channelCfg?.label || convo.channel}
        >
          <span className="text-[8px] text-white font-bold">
            {convo.channel === 'facebook_messenger' ? 'M' : convo.channel === 'zalo' ? 'Z' : convo.channel === 'telegram' ? 'T' : convo.channel === 'website' ? 'W' : '?'}
          </span>
        </div>
        {slaStatus === 'breached' && (
          <div className="absolute -top-0.5 -left-0.5 h-3 w-3 rounded-full bg-red-500 border border-background animate-pulse" title="SLA violated" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{convo.customer.name}</span>
          <span className="text-[11px] text-muted-foreground flex-shrink-0">
            {formatTime(convo.updatedAt)}
          </span>
        </div>
        {convo.subject && (
          <p className="text-xs font-medium text-foreground/80 truncate mt-0.5">{convo.subject}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {convo.owner && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[80px]">
              {convo.owner.name.split(' ').slice(-1)[0]}
            </span>
          )}
          {convo.priority !== 'medium' && PRIORITY_CONFIG[convo.priority] && (
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-4', PRIORITY_CONFIG[convo.priority]?.color)}>
              {PRIORITY_CONFIG[convo.priority]?.label}
            </Badge>
          )}
          {convo.tags.slice(0, 2).map((ct) => (
            <Badge key={ct.tag.id} className="text-[10px] px-1.5 py-0 h-4" style={{ backgroundColor: ct.tag.color + '20', color: ct.tag.color, borderColor: ct.tag.color + '40' }}>
              {ct.tag.name}
            </Badge>
          ))}
          {convo.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{convo.tags.length - 2}</span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function ConversationList() {
  const {
    conversations, setConversations, totalConversations, setTotalConversations,
    activeFilter, setActiveFilter, activeChannel, setActiveChannel,
    searchQuery, setSearchQuery, tags, isLoadingConversations, setIsLoadingConversations,
  } = useCRMStore()

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter === 'unassigned') params.set('assigned', 'unassigned')
      else if (activeFilter !== 'all') params.set('status', activeFilter)
      if (activeChannel !== 'all') params.set('channel', activeChannel)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/conversations?${params}`)
      const json = await res.json()
      setConversations(json.data || [])
      setTotalConversations(json.total || 0)
    } catch (e) {
      console.error('Failed to fetch conversations', e)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [activeFilter, activeChannel, searchQuery, setConversations, setTotalConversations, setIsLoadingConversations])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const handleSearch = (val: string) => {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchConversations(), 300)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Inbox</h2>
          <span className="text-xs text-muted-foreground">{totalConversations} hội thoại</span>
        </div>
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Tìm tên, SĐT, email..."
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                  activeFilter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Channel filter */}
      <div className="px-3 py-2 border-b border-border flex gap-1.5 overflow-x-auto">
        {CHANNEL_FILTERS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setActiveChannel(ch.key)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              activeChannel === ch.key
                ? 'bg-accent text-accent-foreground border border-border'
                : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            {ch.key !== 'all' && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ch.color }} />}
            {ch.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
            Đang tải...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Không có hội thoại nào</p>
          </div>
        ) : (
          conversations.map((convo) => (
            <ConversationItem key={convo.id} convo={convo} />
          ))
        )}
      </ScrollArea>
    </div>
  )
}