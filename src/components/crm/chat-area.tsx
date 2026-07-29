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
  ArrowLeft, Info,
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
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shouldShowDate(messages: Message[], index: number) {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].createdAt).toDateString()
  const curr = new Date(messages[index].createdAt).toDateString()
  return prev !== curr
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-1 animate-fade-in">
      <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
          <Bot className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md">
        <div className="flex gap-1">
          <div className="typing-dot" style={{ animationDelay: '0s' }} />
          <div className="typing-dot" style={{ animationDelay: '0.16s' }} />
          <div className="typing-dot" style={{ animationDelay: '0.32s' }} />
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isLastInGroup }: { message: Message; isLastInGroup: boolean }) {
  const isCustomer = message.senderType === 'customer'
  const isSystem = message.senderType === 'system' || message.senderType === 'bot'
  const isEvent = message.messageType === 'event' || message.messageType === 'system'

  if (isEvent) {
    return (
      <div className="flex justify-center my-2 animate-fade-in">
        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 mb-1 animate-message-bubble', isCustomer ? 'flex-row' : 'flex-row-reverse')}>
      {!isCustomer && (
        <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
          <AvatarFallback className={cn(
            'text-[10px] text-primary-foreground',
            message.senderType === 'bot' ? 'bg-violet-600' : 'bg-primary'
          )}>
            {message.senderType === 'bot' ? <Bot className="h-3.5 w-3.5" /> : 'NV'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn('max-w-[70%] group', isCustomer ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-sm',
            isCustomer
              ? 'bg-muted rounded-tl-md'
              : message.senderType === 'bot'
                ? 'bg-violet-600 text-white rounded-tr-md'
                : 'bg-primary text-primary-foreground rounded-tr-md',
            isLastInGroup && (isCustomer ? 'rounded-bl-md' : 'rounded-br-md')
          )}
        >
          {message.senderType === 'bot' && (
            <div className="flex items-center gap-1 mb-1 opacity-80">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-medium">AI Bot</span>
            </div>
          )}
          {message.content?.split('\n').map((line, i) => (
            <p key={i} className={line ? 'mb-1' : 'mb-1'}>{line}</p>
          ))}
        </div>
        <div className={cn('flex items-center gap-1 mt-0.5', isCustomer ? '' : 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {!isCustomer && isLastInGroup && (
            <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        // Refresh messages for the current conversation
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

      // If automation triggered, refresh after a delay to get bot reply
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
      <div className="flex-1 flex items-center justify-center bg-muted/30 animate-fade-in">
        <div className="text-center text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Send className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">Chọn một hội thoại để bắt đầu</p>
          <p className="text-xs mt-1">Chọn từ danh sách bên trái để xem chi tiết</p>
        </div>
      </div>
    )
  }

  const convo = conversationDetail
  const channelCfg = CHANNEL_CONFIG[convo.channel as keyof typeof CHANNEL_CONFIG]
  const statusCfg = STATUS_CONFIG[convo.status]
  const priorityCfg = PRIORITY_CONFIG[convo.priority]

  // SLA check
  const now = new Date()
  const slaBreached = convo.slaFirstResponse && new Date(convo.slaFirstResponse) < now && convo.status === 'open'

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 md:hidden"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-sm bg-muted">
              {convo.customer.name.split(' ').slice(-2).map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{convo.customer.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1" style={{ borderColor: channelCfg?.color, color: channelCfg?.color }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: channelCfg?.color }} />
                {channelCfg?.label}
              </Badge>
              {slaBreached && (
                <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4 gap-1 animate-glow-pulse">
                  <AlertTriangle className="h-3 w-3" /> SLA!
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {convo.subject && <span className="text-xs text-muted-foreground truncate">{convo.subject}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status badge */}
          <Badge className={cn('text-[11px] px-2 py-0.5 h-5 cursor-pointer transition-transform hover:scale-105', statusCfg?.color)}>
            {statusCfg?.label}
          </Badge>
          {/* Priority badge */}
          <Badge variant="outline" className={cn('text-[11px] px-2 py-0.5 h-5', priorityCfg?.color)}>
            {priorityCfg?.label}
          </Badge>
          {/* Assigned agent */}
          {convo.owner && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <div className={cn('h-2 w-2 rounded-full', convo.owner.status === 'online' ? 'bg-emerald-500' : convo.owner.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400')} />
              <span>{convo.owner.name.split(' ').slice(-1)[0]}</span>
            </div>
          )}
          {/* Mobile info button */}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 md:hidden"
            onClick={() => setMobileView('panel')}
          >
            <Info className="h-4 w-4" />
          </Button>
          {/* AI Bot toggle */}
          <Button
            variant={botEnabled ? "default" : "outline"}
            size="sm"
            className={cn("h-7 gap-1 text-[11px] px-2 transition-all duration-200", botEnabled && "bg-violet-600 hover:bg-violet-700 shadow-sm")}
            onClick={() => setBotEnabled(!botEnabled)}
            title={botEnabled ? "AI ON" : "AI OFF"}
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">AI</span>
          </Button>
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Thay đổi trạng thái</DropdownMenuLabel>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-2" /> {cfg.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Phân công</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAssign('')}>
                <UserPlus className="h-3.5 w-3.5 mr-2" /> Bỏ phân công
              </DropdownMenuItem>
              {agents.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => handleAssign(a.id)}>
                  <User className="h-3.5 w-3.5 mr-2" /> {a.name}
                  <span className={cn('ml-auto h-2 w-2 rounded-full', a.status === 'online' ? 'bg-emerald-500' : a.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400')} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4 messages-scroll">
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.map((msg, idx) => {
            const showDate = shouldShowDate(messages, idx)
            const nextMsg = messages[idx + 1]
            const isLastInGroup = !nextMsg ||
              nextMsg.senderType !== msg.senderType ||
              new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 60000

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3 animate-fade-in">
                    <span className="text-[11px] text-muted-foreground bg-muted/80 px-3 py-1 rounded-full">
                      {formatFullDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} isLastInGroup={isLastInGroup} />
              </div>
            )
          })}
          {isBotTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      {convo.status !== 'resolved' && convo.status !== 'closed' && convo.status !== 'spam' ? (
        <div className="border-t border-border p-3">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 transition-colors">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
              className="min-h-[40px] max-h-[120px] resize-none text-sm focus-ring-transition"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!replyText.trim() || isSendingMessage}
              size="icon" className="h-9 w-9 flex-shrink-0 send-btn"
            >
              {isSendingMessage ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-3 bg-muted/30 animate-fade-in">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Hội thoại đã {convo.status === 'resolved' ? 'được giải quyết' : convo.status === 'closed' ? 'đóng' : 'đánh dấu spam'}
            </span>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleStatusChange('open')}>
              Mở lại
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
