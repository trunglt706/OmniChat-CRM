'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, Sparkles, Upload } from 'lucide-react'
import { GRADIENT_CLASSES, formatMessageTime } from '@/lib/const/chat'
import type { Message } from '@/lib/types'

interface BubbleProps {
  message: Message
  isLastInGroup: boolean
  showAvatar: boolean
  gradientIdx: number
  customerInit: string
  agentInit: string
  onImageClick?: (url: string) => void
  t: (key: string) => string
  locale: string
}

export const MessageBubble = memo(function MessageBubble({ message, isLastInGroup, showAvatar, gradientIdx, customerInit, agentInit, onImageClick, t, locale }: BubbleProps) {
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
            {message.senderType === 'bot' ? <Bot className="h-3.5 w-3.5" /> : isCustomer ? (message.senderName || customerInit).split(' ').slice(-2).map(n => n[0]).join('') : agentInit}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && <div className="w-7 flex-shrink-0" />}
      <div className={cn('max-w-[72%] group', isCustomer ? 'items-start' : 'items-end')}>
        <div className={cn(
          'px-3.5 py-2.5 text-[13px] leading-relaxed break-words transition-all duration-200',
          isCustomer
            ? cn('bubble-customer rounded-2xl', isLastInGroup && 'rounded-bl-lg', showAvatar && 'rounded-tl-sm')
            : message.senderType === 'bot'
              ? cn('bubble-bot rounded-2xl shadow-lg shadow-violet-500/15', isLastInGroup && 'rounded-br-lg', showAvatar && 'rounded-tr-sm')
              : cn('bubble-agent rounded-2xl', isLastInGroup && 'rounded-br-lg', showAvatar && 'rounded-tr-sm'),
        )}>
          {message.senderType === 'bot' && (
            <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">{t('common.aiBot')}</span>
            </div>
          )}
          {isImage && message.attachmentUrl && (
            <div className="mb-1">
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || t('common.image')}
                className="rounded-xl max-w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
                onClick={() => onImageClick?.(message.attachmentUrl!)}
              />
              {message.content && <p className="mt-1.5">{message.content}</p>}
            </div>
          )}
          {!isImage && message.attachmentUrl && (
            <a 
              href={message.attachmentUrl}
              download={message.attachmentName || 'download'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors rounded-lg px-3 py-2 mb-1 cursor-pointer"
            >
              <Upload className="h-4 w-4 opacity-70 flex-shrink-0" />
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium truncate">{message.attachmentName || t('common.file')}</p>
                <p className="text-[10px] opacity-60">{message.attachmentType || t('common.file').toLowerCase()}</p>
              </div>
            </a>
          )}
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
            {formatMessageTime(message.createdAt, locale)}
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
