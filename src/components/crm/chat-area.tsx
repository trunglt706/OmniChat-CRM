'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CHANNEL_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, type Message } from '@/lib/types'
import {
  Send, Paperclip, MoreVertical, CheckCircle, Clock, AlertTriangle,
  Bot, User, Shield, Settings, UserPlus, Tag, Archive, XCircle, Sparkles,
  ArrowLeft, Info, SmilePlus, ImagePlus, Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shouldShowDate(messages: Message[], index: number) {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].createdAt).toDateString()
  const curr = new Date(messages[index].createdAt).toDateString()
  return prev !== curr
}

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6', 'avatar-gradient-7', 'avatar-gradient-8']

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 mb-2 animate-fade-in">
      <Avatar className="h-7 w-7 flex-shrink-0 mt-1 ring-2 ring-violet-500/20">
        <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <Bot className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          <div className="typing-dot" style={{ animationDelay: '0s', color: 'oklch(0.5 0.03 265)' }} />
          <div className="typing-dot" style={{ animationDelay: '0.16s', color: 'oklch(0.5 0.03 265)' }} />
          <div className="typing-dot" style={{ animationDelay: '0.32s', color: 'oklch(0.5 0.03 265)' }} />
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isLastInGroup, showAvatar, gradientIdx }: { message: Message; isLastInGroup: boolean; showAvatar: boolean; gradientIdx: number }) {
  const isCustomer = message.senderType === 'customer'
  const isSystem = message.senderType === 'system' || message.senderType === 'bot'
  const isEvent = message.messageType === 'event' || message.messageType === 'system'

  if (isEvent) {
    return (
      <div className="flex justify-center my-3 animate-fade-in">
        <span className="text-[11px] text-muted-foreground/70 bg-muted/60 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
          {message.content}
        </span>
      </div>
    )
  }

  const gradient = GRADIENT_CLASSES[gradientIdx % GRADIENT_CLASSES.length]

  return (
    <div className={cn('flex gap-2.5 mb-1 animate-message-in', isCustomer ? 'flex-row' : 'flex-row-reverse')}>
      {showAvatar && (
        <Avatar className={cn(
          'h-7 w-7 flex-shrink-0 mt-1 transition-transform duration-200',
          isCustomer ? '' : 'ring-2 ring-primary/15'
        )}>
          <AvatarFallback className={cn(
            'text-[10px] text-white',
            message.senderType === 'bot'
              ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
              : isCustomer
                ? gradient
                : 'bg-gradient-to-br from-indigo-500 to-violet-600'
          )}>
            {message.senderType === 'bot' ? <Bot className="h-3.5 w-3.5" /> : isCustomer ? message.sender?.name?.split(' ').slice(-2).map(n => n[0]).join('') || 'KH' : 'NV'}
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
          {message.content?.split('\n').map((line, i) => (
            <p key={i} className={line ? 'mb-1' : 'mb-1'}>{line || ' '}</p>
          ))}
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
}

export default function ChatArea() {
  const {
    selectedConversationId, conversationDetail, setConversationDetail,
    messages, setMessages, addMessage,
    isSendingMessage, setIsSendingMessage,
    agents, setAgents,
    botEnabled, setBotEnabled, isBotTyping, setIsBotTyping,
    setMobileView, showRightPanel, setShowRightPanel,
    simulationRunning,
  } = useCRMStore()

  const [replyText, setReplyText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevMessageCountRef = useRef(messages.length)

  // Fetch conversation detail + messages
  const fetchConversation = useCallback(async () => {
    if (!selectedConversationId) return
    try {
      const [detailRes, messagesRes, agentsRes] = await Promise.all([
        fetch(`/api/conversations/${selectedConversationId}`),
        fetch(`/api/conversations/${selectedConversationId}/messages`),
        fetch('/api/agents'),
      ])
      const detail = await detailRes.json()
      const msgs = await messagesRes.json()
      const agentsData = await agentsRes.json()

      setConversationDetail(detail)
      setMessages(msgs)
      if (agentsData.length) setAgents(agentsData)
    } catch (e) {
      console.error('Failed to fetch conversation', e)
    }
  }, [selectedConversationId, setConversationDetail, setMessages, setAgents])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // Listen for real-time messages in current conversation
  useEffect(() => {
    if (!selectedConversationId) return
    const handleNewMessage = (e: Event) => {
      const data = (e as CustomEvent).detail as { conversationId: string; message: any }
      if (data.conversationId === selectedConversationId) {
        fetch(`/api/conversations/${selectedConversationId}/messages`)
          .then(r => r.json())
          .then(msgs => setMessages(msgs))
          .catch(() => {})
      }
    }
    window.addEventListener('crm:new_message', handleNewMessage)
    return () => window.removeEventListener('crm:new_message', handleNewMessage)
  }, [selectedConversationId, setMessages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [replyText])

  // Send message
  const handleSend = async () => {
    if (!replyText.trim() || !selectedConversationId) return
    setIsSendingMessage(true)
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      const data = await res.json()
      const newMsg = data.message || data
      addMessage(newMsg)
      setReplyText('')
      textareaRef.current?.focus()

      if (data.automationResult) {
        setTimeout(async () => {
          const msgs = await fetch(`/api/conversations/${selectedConversationId}/messages`).then(r => r.json())
          setMessages(msgs)
          window.dispatchEvent(new CustomEvent('crm:refresh_list'))
        }, 500)
      }
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setIsSendingMessage(false)
    }
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
      fetchConversation()
      window.dispatchEvent(new CustomEvent('crm:refresh_list'))
    } catch (e) {
      console.error('Failed to change status', e)
    }
  }

  // Assign agent
  const handleAssign = async (agentId: string) => {
    if (!selectedConversationId) return
    try {
      await fetch(`/api/conversations/${selectedConversationId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: agentId || null }),
      })
      fetchConversation()
      window.dispatchEvent(new CustomEvent('crm:refresh_list'))
    } catch (e) {
      console.error('Failed to assign', e)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!selectedConversationId || !conversationDetail) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 animate-fade-in">
        <div className="text-center text-muted-foreground/50 animate-float">
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5">
            <Send className="h-9 w-9 text-primary/30" />
          </div>
          <p className="text-sm font-semibold text-foreground/40">Chọn một hội thoại để bắt đầu</p>
          <p className="text-xs mt-1.5 text-muted-foreground/35">Chọn từ danh sách bên trái để xem chi tiết</p>
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

  // Group messages for avatar display
  let agentMsgCount = 0
  let customerMsgCount = 0

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border/40 glass flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
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
              <DropdownMenuLabel className="text-xs px-2 py-1.5">Thay đổi trạng thái</DropdownMenuLabel>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)} className="rounded-lg text-xs py-2">
                  <CheckCircle className="h-3.5 w-3.5 mr-2" /> {cfg.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs px-2 py-1.5">Phân công</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAssign('')} className="rounded-lg text-xs py-2">
                <UserPlus className="h-3.5 w-3.5 mr-2" /> Bỏ phân công
              </DropdownMenuItem>
              {agents.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => handleAssign(a.id)} className="rounded-lg text-xs py-2">
                  <User className="h-3.5 w-3.5 mr-2" /> {a.name}
                  <span className={cn('ml-auto h-2 w-2 rounded-full', a.status === 'online' ? 'bg-emerald-500' : a.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400')} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
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

            if (msg.senderType === 'customer') customerMsgCount++
            else agentMsgCount++

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4 animate-fade-in">
                    <span className="date-separator text-[11px] text-muted-foreground/70 px-4 py-1.5 rounded-full font-medium">
                      {formatFullDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} isLastInGroup={isLastInGroup} showAvatar={showAvatar} gradientIdx={customerMsgCount} />
              </div>
            )
          })}
          {isBotTyping && <TypingIndicator />}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Message input composer */}
      {convo.status !== 'resolved' && convo.status !== 'closed' && convo.status !== 'spam' ? (
        <div className={cn(
          'composer-area p-3 transition-all duration-300',
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Đính kèm tệp</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200">
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gửi hình ảnh</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Nhập tin nhắn..."
                className="min-h-[40px] max-h-[120px] resize-none text-[13px] border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 p-2"
                rows={1}
              />
              <div className="flex gap-0.5 pr-0.5 pb-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-all duration-200">
                        <SmilePlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Biểu tượng cảm xúc</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  onClick={handleSend}
                  disabled={!replyText.trim() || isSendingMessage}
                  size="icon" className={cn(
                    'h-9 w-9 flex-shrink-0 rounded-xl send-btn',
                    replyText.trim() && 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600'
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
              Enter để gửi · Shift+Enter xuống dòng
            </p>
          </div>
        </div>
      ) : (
        <div className="composer-area p-4 animate-fade-in">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">
              Hội thoại đã {convo.status === 'resolved' ? 'được giải quyết' : convo.status === 'closed' ? 'đóng' : 'đánh dấu spam'}
            </span>
            <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200" onClick={() => handleStatusChange('open')}>
              Mở lại
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}