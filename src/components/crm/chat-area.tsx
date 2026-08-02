'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { socket } from '@/lib/socket'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { CHANNEL_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, type Message } from '@/lib/types'
import {
  Send, Paperclip, MoreVertical, CheckCircle, Clock, AlertTriangle,
  Bot, User, Shield, Settings, UserPlus, Tag, Archive, XCircle, Sparkles,
  ArrowLeft, Info, SmilePlus, ImagePlus, Mic, X, Upload, ChevronUp, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useT } from '@/i18n/useT'

const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🤔','😮','😢','😤',
  '👍','👋','🙌','👏','🙏','✅','❤️','🔥','💯','🎉',
  '📧','📎','🖼️','🛒','💰','⭐','🔔','💬','🤝','👋',
]

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6', 'avatar-gradient-7', 'avatar-gradient-8']

const MESSAGES_PER_PAGE = 15

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shouldShowDate(messages: Message[], idx: number) {
  if (idx === 0) return true
  const prev = new Date(messages[idx - 1].createdAt).toDateString()
  const curr = new Date(messages[idx].createdAt).toDateString()
  return prev !== curr
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 px-1 py-2">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="bubble-bot rounded-2xl px-4 py-3 shadow-lg shadow-violet-500/15">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" style={{ animationDelay: '0s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Memoized Message Bubble ───
interface BubbleProps {
  message: Message
  isLastInGroup: boolean
  showAvatar: boolean
  gradientIdx: number
  onImageClick?: (url: string) => void
}

const MessageBubble = memo(function MessageBubble({ message, isLastInGroup, showAvatar, gradientIdx, onImageClick }: BubbleProps) {
  const isCustomer = message.senderType === 'customer'
  const gradient = GRADIENT_CLASSES[gradientIdx % GRADIENT_CLASSES.length]
  const isImage = message.messageType === 'image'

  return (
    <div className={cn('flex gap-2.5 px-1 animate-message-in', isCustomer ? 'justify-start' : 'justify-end')}>
      {showAvatar && (
        <Avatar className={cn(
          'h-7 w-7 flex-shrink-0 shadow-sm',
          message.senderType === 'bot'
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
            : isCustomer
              ? gradient
              : 'bg-gradient-to-br from-indigo-500 to-violet-600'
        )}>
          <AvatarFallback className="text-[10px] text-white font-semibold">
            {message.senderType === 'bot' ? <Bot className="h-3.5 w-3.5" /> : isCustomer ? (message.senderName || 'KH').split(' ').slice(-2).map(n => n[0]).join('') : 'NV'}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && <div className="w-7 flex-shrink-0" />}
      <div className={cn('max-w-[72%] group', isCustomer ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-3.5 py-2.5 text-[13px] leading-relaxed break-words transition-all duration-200',
            isCustomer
              ? cn('bubble-customer rounded-2xl', isLastInGroup && 'rounded-bl-lg', showAvatar && 'rounded-tl-sm')
              : message.senderType === 'bot'
                ? cn('bubble-bot rounded-2xl shadow-lg shadow-violet-500/15', isLastInGroup && 'rounded-br-lg', showAvatar && 'rounded-tr-sm')
                : cn('bubble-agent rounded-2xl', isLastInGroup && 'rounded-br-lg', showAvatar && 'rounded-tr-sm'),
          )}
        >
          {message.senderType === 'bot' && (
            <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">AI Bot</span>
            </div>
          )}
          {/* Image content */}
          {isImage && message.attachmentUrl && (
            <div className="mb-1">
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || 'Image'}
                className="rounded-xl max-w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
                onClick={() => onImageClick?.(message.attachmentUrl!)}
              />
              {message.content && (
                <p className="mt-1.5">{message.content}</p>
              )}
            </div>
          )}
          {/* File attachment */}
          {!isImage && message.attachmentUrl && (
            <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 mb-1">
              <Upload className="h-4 w-4 opacity-70 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{message.attachmentName || 'File'}</p>
                <p className="text-[10px] opacity-60">{message.attachmentType || 'file'}</p>
              </div>
            </div>
          )}
          {/* Text content */}
          {message.content && !isImage && (
            <>
              {message.content.split('\n').map((line, i) => (
                <p key={i} className={line ? 'mb-1' : 'mb-1'}>{line || '\u00a0'}</p>
              ))}
            </>
          )}
        </div>
        <div className={cn('flex items-center gap-1.5 mt-1 px-1', isCustomer ? '' : 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {formatMessageTime(message.createdAt)}
          </span>
          {!isCustomer && isLastInGroup && (
            <svg className="h-3.5 w-3.5 text-blue-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── Attached File with image preview ───
interface AttachedFile {
  name: string
  size: number
  type: 'image' | 'file'
  dataUrl?: string
  file?: File
}

export default function ChatArea() {
  // Granular selectors to minimize re-renders
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const conversationDetail = useCRMStore((s) => s.conversationDetail)
  const setConversationDetail = useCRMStore((s) => s.setConversationDetail)
  const messages = useCRMStore((s) => s.messages)
  const setMessages = useCRMStore((s) => s.setMessages)
  const prependMessages = useCRMStore((s) => s.prependMessages)
  const addMessage = useCRMStore((s) => s.addMessage)
  const isSendingMessage = useCRMStore((s) => s.isSendingMessage)
  const setIsSendingMessage = useCRMStore((s) => s.setIsSendingMessage)
  const hasMoreMessages = useCRMStore((s) => s.hasMoreMessages)
  const setHasMoreMessages = useCRMStore((s) => s.setHasMoreMessages)
  const isLoadingMoreMessages = useCRMStore((s) => s.isLoadingMoreMessages)
  const setIsLoadingMoreMessages = useCRMStore((s) => s.setIsLoadingMoreMessages)
  const agents = useCRMStore((s) => s.agents)
  const setAgents = useCRMStore((s) => s.setAgents)
  const botEnabled = useCRMStore((s) => s.botEnabled)
  const setBotEnabled = useCRMStore((s) => s.setBotEnabled)
  const isBotTyping = useCRMStore((s) => s.isBotTyping)
  const setMobileView = useCRMStore((s) => s.setMobileView)
  const showRightPanel = useCRMStore((s) => s.showRightPanel)

  const { t } = useT()

  const [replyText, setReplyText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)
  const loadingMoreRef = useRef(false)

  // ─── Fetch messages with pagination ───
  const fetchMessages = useCallback(async (conversationId: string, before?: string) => {
    if (!conversationId) return
    const params = new URLSearchParams({ limit: String(MESSAGES_PER_PAGE) })
    if (before) params.set('before', before)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?${params}`)
      const json = await res.json()
      return json // { data: Message[], total, hasMore }
    } catch (e) {
      console.error('Failed to fetch messages', e)
      return null
    }
  }, [])

  // Initial load: fetch conversation detail + last 15 messages
  useEffect(() => {
    if (!selectedConversationId) return
    isInitialLoadRef.current = true
    prevMessageCountRef.current = 0

    const loadInitial = async () => {
      try {
        const [detailRes, msgsRes, agentsRes] = await Promise.all([
          fetch(`/api/conversations/${selectedConversationId}`),
          fetch(`/api/conversations/${selectedConversationId}/messages?limit=${MESSAGES_PER_PAGE}`),
          fetch('/api/agents'),
        ])
        const detail = await detailRes.json()
        const msgsJson = await msgsRes.json()
        const agentsData = await agentsRes.json()

        setConversationDetail(detail)
        setMessages(msgsJson.data || [])
        setHasMoreMessages(msgsJson.hasMore || false)
        if (agentsData.length) setAgents(agentsData)

        // Scroll to bottom after render
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView()
          isInitialLoadRef.current = false
        })
      } catch (e) {
        console.error('Failed to fetch conversation', e)
      }
    }
    loadInitial()
  }, [selectedConversationId, setConversationDetail, setMessages, setHasMoreMessages, setAgents, fetchMessages])

  // Auto scroll to bottom on NEW messages (not on initial load or prepend)
  useEffect(() => {
    if (isInitialLoadRef.current) return
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // ─── Load older messages on scroll up ───
  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversationId || !hasMoreMessages || isLoadingMoreMessages || loadingMoreRef.current) return
    if (messages.length === 0) return

    loadingMoreRef.current = true
    setIsLoadingMoreMessages(true)

    try {
      // Save current scroll position
      const container = scrollContainerRef.current
      const prevScrollHeight = container?.scrollHeight || 0
      const prevScrollTop = container?.scrollTop || 0

      const oldestMsg = messages[0]
      const result = await fetchMessages(selectedConversationId, oldestMsg.createdAt)

      if (result && result.data && result.data.length > 0) {
        prependMessages(result.data)
        setHasMoreMessages(result.hasMore || false)

        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop
          }
        })
      } else {
        setHasMoreMessages(false)
      }
    } catch (e) {
      console.error('Failed to load older messages', e)
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMoreMessages(false)
    }
  }, [selectedConversationId, hasMoreMessages, isLoadingMoreMessages, messages, fetchMessages, prependMessages, setHasMoreMessages, setIsLoadingMoreMessages])

  // Intersection observer for scroll-to-top loading
  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMoreMessages) {
          loadOlderMessages()
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMoreMessages, isLoadingMoreMessages, loadOlderMessages])

  // ─── Socket: realtime messages for current conversation ───
  useEffect(() => {
    if (!selectedConversationId) return

    const handleNewMessage = (data: { message: any }) => {
      if (data.message?.conversationId === selectedConversationId) {
        // Only refetch if message isn't already in our list (avoid duplicates)
        const exists = useCRMStore.getState().messages.some(m => m.id === data.message.id)
        if (!exists) {
          fetch(`/api/conversations/${selectedConversationId}/messages?limit=1&before=${new Date(Date.now() + 60000).toISOString()}`)
            .then(r => r.json())
            .then(json => {
              if (json.data?.length > 0) {
                const latest = json.data[0]
                const exists = useCRMStore.getState().messages.some(m => m.id === latest.id)
                if (!exists) addMessage(latest)
              }
            })
            .catch(() => {})
        }
      }
    }

    const unsub = socket.on(`message:${selectedConversationId}`, handleNewMessage)
    return unsub
  }, [selectedConversationId, addMessage])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [replyText])

  // ─── Send message (text + images/files) ───
  const handleSend = async () => {
    if (!selectedConversationId) return
    const hasText = replyText.trim().length > 0
    const hasFiles = attachedFiles.length > 0
    if (!hasText && !hasFiles) return

    setIsSendingMessage(true)
    try {
      // Send text message if there's text
      if (hasText) {
        const content = replyText.trim()
        const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const data = await res.json()
        const newMsg = data.message || data
        addMessage(newMsg)

        if (data.automationResult) {
          setTimeout(async () => {
            const msgs = await fetch(`/api/conversations/${selectedConversationId}/messages?limit=5`).then(r => r.json())
            const current = useCRMStore.getState().messages
            const newIds = new Set((msgs.data || []).map((m: Message) => m.id))
            const missing = (msgs.data || []).filter((m: Message) => !current.some(c => c.id === m.id))
            missing.forEach((m: Message) => addMessage(m))
          }, 500)
        }
      }

      // Send image messages
      for (const file of attachedFiles) {
        if (file.type === 'image' && file.dataUrl) {
          const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageType: 'image',
              content: null,
              attachmentUrl: file.dataUrl,
              attachmentName: file.name,
              attachmentType: file.file?.type || 'image/*',
            }),
          })
          const data = await res.json()
          addMessage(data.message || data)
        } else {
          // File attachment as text reference
          const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `\u{1F4CE} ${file.name}`,
              messageType: 'file',
              attachmentName: file.name,
              attachmentType: file.file?.type || 'application/octet-stream',
            }),
          })
          const data = await res.json()
          addMessage(data.message || data)
        }
      }

      setReplyText('')
      setAttachedFiles([])
      textareaRef.current?.focus()
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // ─── File / Image handling ───
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, forceType?: 'image' | 'file') => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles: AttachedFile[] = []
    for (const f of files) {
      const isImage = forceType === 'image' || f.type.startsWith('image/')
      const entry: AttachedFile = {
        name: f.name,
        size: f.size,
        type: isImage ? 'image' : 'file',
        file: f,
      }
      if (isImage) {
        entry.dataUrl = await readFileAsDataUrl(f)
      }
      newFiles.push(entry)
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
    textareaRef.current?.focus()
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(prev => prev + emoji)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  // Change status
  const handleStatusChange = async (status: string) => {
    if (!selectedConversationId) return
    try {
      await fetch(`/api/conversations/${selectedConversationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      // Re-fetch detail
      const detailRes = await fetch(`/api/conversations/${selectedConversationId}`)
      const detail = await detailRes.json()
      setConversationDetail(detail)
    } catch (e) {
      console.error('Failed to change status', e)
    }
  }

  // Assign agent
  const handleAssign = async (agentId: string) => {
    if (!selectedConversationId) return
    setAssignLoading(true)
    try {
      await fetch(`/api/conversations/${selectedConversationId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: agentId || null }),
      })
      const detailRes = await fetch(`/api/conversations/${selectedConversationId}`)
      const detail = await detailRes.json()
      setConversationDetail(detail)
      setAssignOpen(false)
    } catch (e) {
      console.error('Failed to assign', e)
    } finally {
      setAssignLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const handleImageClick = useCallback((url: string) => setImagePreviewUrl(url), [])

  // ─── Empty state ───
  if (!selectedConversationId || !conversationDetail) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground/50 animate-float">
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5">
            <Send className="h-9 w-9 text-primary/30" />
          </div>
          <p className="text-sm font-semibold text-foreground/40">{t('chat.empty')}</p>
          <p className="text-xs mt-1.5 text-muted-foreground/35">{t('chat.emptyDesc')}</p>
        </div>
      </div>
    )
  }

  const convo = conversationDetail
  const channelCfg = CHANNEL_CONFIG[convo.channel as keyof typeof CHANNEL_CONFIG]
  const statusCfg = STATUS_CONFIG[convo.status]
  const priorityCfg = PRIORITY_CONFIG[convo.priority]
  const now = new Date()
  const slaBreached = convo.slaFirstResponse && new Date(convo.slaFirstResponse) < now && convo.status === 'open'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border/40 glass flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 md:hidden rounded-xl hover:bg-foreground/5"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Avatar className={cn(
              'h-10 w-10 transition-all duration-300',
              convo.status === 'open' && 'avatar-ring-online'
            )}>
              <AvatarFallback className={cn('text-sm text-white font-semibold', GRADIENT_CLASSES[0])}>
                {convo.customer.name.split(' ').slice(-2).map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-all duration-300',
              convo.status === 'open' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-400'
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{convo.customer.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] gap-1 rounded-lg font-medium" style={{ borderColor: channelCfg?.color + '50', color: channelCfg?.color, backgroundColor: channelCfg?.color + '10' }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: channelCfg?.color }} />
                {channelCfg?.label}
              </Badge>
              {slaBreached && (
                <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-[18px] gap-1 animate-glow-pulse rounded-lg dark:bg-red-950/50 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" /> SLA!
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {convo.subject && <span className="text-xs text-muted-foreground/60 truncate">{convo.subject}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className={cn('text-[11px] px-2.5 py-0.5 h-[22px] cursor-pointer rounded-lg font-medium transition-all duration-200 hover:scale-105', statusCfg?.color)}>
            {statusCfg?.label}
          </Badge>
          <Badge variant="outline" className={cn('text-[11px] px-2 py-0.5 h-[22px] rounded-lg font-medium', priorityCfg?.color)}>
            {priorityCfg?.label}
          </Badge>
          {convo.owner && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/70 bg-foreground/[0.03] px-2 py-1 rounded-lg">
              <div className={cn('h-2 w-2 rounded-full', convo.owner.status === 'online' ? 'bg-emerald-500' : convo.owner.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400')} />
              <span className="font-medium">{convo.owner.name.split(' ').slice(-1)[0]}</span>
            </div>
          )}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 md:hidden rounded-xl hover:bg-foreground/5"
            onClick={() => setMobileView('panel')}
          >
            <Info className="h-4 w-4" />
          </Button>
          <Popover open={assignOpen} onOpenChange={setAssignOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={cn(
                  'h-7 gap-1 text-[11px] px-2.5 rounded-lg font-medium transition-all duration-200',
                  convo.owner ? 'border-primary/20 text-primary hover:bg-primary/5' : 'hover:bg-foreground/5'
                )}
              >
                <UserPlus className="h-3 w-3" />
                <span className="hidden sm:inline max-w-[80px] truncate">
                  {convo.owner ? convo.owner.name.split(' ').slice(-1)[0] : t('chat.assignTo')}
                </span>
                {convo.owner && (
                  <span className={cn(
                    'ml-0.5 h-2 w-2 rounded-full flex-shrink-0',
                    convo.owner.status === 'online' ? 'bg-emerald-500' : convo.owner.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                  )} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[220px] p-1.5 rounded-xl">
              <div className="px-2 py-1.5 mb-1">
                <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">{t('chat.assignTo')}</p>
              </div>
              <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
                <button
                  onClick={() => handleAssign('')}
                  disabled={assignLoading}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-foreground/[0.04] transition-colors text-left"
                >
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{t('chat.unassign')}</p>
                    <p className="text-[10px] text-muted-foreground/50">{t('chat.returnToQueue')}</p>
                  </div>
                </button>
                {assignLoading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
                {agents.map((a) => {
                  const isCurrentOwner = convo.owner?.id === a.id
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleAssign(a.id)}
                      disabled={assignLoading}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-foreground/[0.04] transition-colors text-left',
                        isCurrentOwner && 'bg-primary/5'
                      )}
                    >
                      <div className="relative">
                        <div className={cn('h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold', GRADIENT_CLASSES[agents.indexOf(a) % GRADIENT_CLASSES.length])}>
                          {a.name.split(' ').slice(-2).map(n => n[0]).join('')}
                        </div>
                        <span className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-popover',
                          a.status === 'online' ? 'bg-emerald-500' : a.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 truncate">{a.email}</p>
                      </div>
                      {isCurrentOwner && <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={botEnabled ? 'default' : 'outline'}
            size="sm"
            className={cn('h-7 gap-1 text-[11px] px-2.5 rounded-lg transition-all duration-300',
              botEnabled
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25'
                : 'hover:bg-foreground/5'
            )}
            onClick={() => setBotEnabled(!botEnabled)}
            title={botEnabled ? 'AI ON' : 'AI OFF'}
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">AI</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-foreground/5 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs px-2 py-1.5">{t('chat.changeStatus')}</DropdownMenuLabel>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)} className="rounded-lg text-xs py-2">
                  <CheckCircle className="h-3.5 w-3.5 mr-2" /> {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area — native scroll with lazy load */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1 w-full" />

        {/* Load more indicator */}
        {isLoadingMoreMessages && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground/50 ml-2">{t('chat.loadingMore')}</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
          {hasMoreMessages && !isLoadingMoreMessages && (
            <button
              onClick={loadOlderMessages}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {t('chat.loadMore')}
            </button>
          )}
          {messages.map((msg, idx) => {
            const showDate = shouldShowDate(messages, idx)
            const prevMsg = idx > 0 ? messages[idx - 1] : null
            const nextMsg = messages[idx + 1]
            const isLastInGroup = !nextMsg ||
              nextMsg.senderType !== msg.senderType ||
              new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 60000
            const showAvatar = !prevMsg ||
              prevMsg.senderType !== msg.senderType ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 60000

            // Count customer messages for gradient index
            let customerIdx = 0
            for (let i = 0; i <= idx; i++) {
              if (messages[i].senderType === 'customer') customerIdx++
            }
            const gradientIdx = msg.senderType === 'customer' ? customerIdx : 0

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="date-separator text-[11px] text-muted-foreground/70 px-4 py-1.5 rounded-full font-medium">
                      {formatFullDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} isLastInGroup={isLastInGroup} showAvatar={showAvatar} gradientIdx={gradientIdx} onImageClick={handleImageClick} />
              </div>
            )
          })}
          {isBotTyping && <TypingIndicator />}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Image preview modal */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setImagePreviewUrl(null)}
        >
          <img
            src={imagePreviewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setImagePreviewUrl(null)}
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap flex-shrink-0">
          {attachedFiles.map((file, i) => (
            <div key={i} className="relative group animate-fade-in">
              {file.type === 'image' && file.dataUrl ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/30">
                  <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-muted/80 rounded-lg px-2.5 py-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <span className="text-muted-foreground/50">{formatFileSize(file.size)}</span>
                  <button onClick={() => removeFile(i)} className="ml-0.5 text-muted-foreground/40 hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message input composer */}
      {convo.status !== 'resolved' && convo.status !== 'closed' && convo.status !== 'spam' ? (
        <div className={cn(
          'composer-area p-3 flex-shrink-0 transition-all duration-300',
          isFocused && 'shadow-[0_-8px_32px_oklch(0.49_0.2_265/0.06)]'
        )}>
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              'flex gap-2 items-end rounded-2xl p-1.5 transition-all duration-300',
              'bg-muted/50 border border-border/40',
              isFocused && 'bg-background border-primary/20 shadow-lg shadow-primary/5'
            )}>
              <div className="flex gap-0.5 pl-1 pb-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200"
                        onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('chat.attachFile')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200"
                        onClick={() => imageInputRef.current?.click()}>
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('chat.sendImage')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => handleFileSelect(e, 'file')} />
                <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileSelect(e, 'image')} />
              </div>
              <Textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t('chat.placeholder')}
                className="min-h-[40px] max-h-[120px] resize-none text-[13px] border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 p-2"
                rows={1}
              />
              <div className="flex gap-0.5 pr-0.5 pb-0.5">
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200">
                      <SmilePlus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-[280px] p-2 rounded-xl">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-base hover:bg-foreground/[0.06] transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={handleSend}
                  disabled={(!replyText.trim() && attachedFiles.length === 0) || isSendingMessage}
                  size="icon" className={cn(
                    'h-9 w-9 flex-shrink-0 rounded-xl send-btn',
                    (replyText.trim() || attachedFiles.length > 0) && 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600'
                  )}
                >
                  {isSendingMessage ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/30 text-center mt-1.5 font-medium">
              {t('chat.sendHint')}
            </p>
          </div>
        </div>
      ) : (
        <div className="composer-area p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">
              {convo.status === 'resolved' ? t('chat.resolved') : convo.status === 'closed' ? t('chat.closed') : t('chat.spam')}
            </span>
            <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200" onClick={() => handleStatusChange('open')}>
              {t('chat.reopen')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
