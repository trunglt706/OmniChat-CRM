'use client'

import { useCRMStore, type AppNotification, type NotificationType } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
// Native scroll
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  MessageSquare, UserCheck, AlertTriangle, AtSign, Info,
  CheckCheck, Trash2, BellOff, Sparkles, ArrowRight,
} from 'lucide-react'
import { useT } from '@/i18n/useT'

const NOTIF_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  new_message: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  assignment: { icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  sla_breach: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  mention: { icon: AtSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  system: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  automation: { icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-500/10' },
}

function formatNotifTime(d: string, t: (key: string, params?: Record<string, string | number>) => string) {
  const date = new Date(d), now = new Date(), diff = now.getTime() - date.getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000)
  if (m < 1) return t('notif.time.justNow')
  if (m < 60) return t('notif.time.minutesAgo', { m })
  if (h < 24) return t('notif.time.hoursAgo', { h })
  return date.toLocaleDateString('vi-VN')
}

function NotifItem({ notif, onGoto, t }: { notif: AppNotification; onGoto: () => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  const cfg = NOTIF_CONFIG[notif.type]
  const Icon = cfg.icon

  return (
    <button
      onClick={onGoto}
      className={cn(
        'w-full text-left flex gap-3 p-3 rounded-xl transition-all duration-200 group',
        notif.read
          ? 'hover:bg-foreground/[0.02]'
          : 'bg-primary/[0.04] hover:bg-primary/[0.06]'
      )}
    >
      <div className={cn(
        'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
        cfg.bg
      )}>
        <Icon className={cn('h-4 w-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-[13px] truncate', notif.read ? 'text-foreground/70' : 'font-semibold text-foreground')}>
            {notif.title}
          </p>
          {!notif.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
        </div>
        <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5 leading-relaxed">{notif.body}</p>
        <p className="text-[10px] text-muted-foreground/40 mt-1 font-medium tabular-nums">{formatNotifTime(notif.createdAt, t)}</p>
      </div>
    </button>
  )
}

export default function NotificationPanel() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotification,
    clearAllNotifications,
    setOpenSheet,
    setSelectedConversationId,
    setActiveView,
    setMobileView,
  } = useCRMStore()

  const { t } = useT()

  const unreadCount = notifications.filter(n => !n.read).length

  const handleGoto = (notif: AppNotification) => {
    markNotificationRead(notif.id)
    if (notif.conversationId) {
      setSelectedConversationId(notif.conversationId)
      setActiveView('inbox')
      setMobileView('chat')
    }
    setOpenSheet(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-up">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold tracking-tight">{t('notif.panel.title')}</h2>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-indigo-500/20">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 rounded-lg text-[11px] text-primary font-medium hover:bg-primary/5"
                onClick={() => markAllNotificationsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t('notif.markAllRead')}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground font-medium hover:bg-foreground/[0.04]"
                onClick={() => clearAllNotifications()}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t('notif.clearAll')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator className="opacity-40" />

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-foreground/[0.02] flex items-center justify-center mb-4">
              <BellOff className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">{t('notif.empty')}</p>
            <p className="text-[11px] mt-1 text-muted-foreground/30">{t('notif.emptyDesc')}</p>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {notifications.map((notif) => (
              <NotifItem key={notif.id} notif={notif} onGoto={() => handleGoto(notif)} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
