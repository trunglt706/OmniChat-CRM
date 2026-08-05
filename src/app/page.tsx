'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { socket } from '@/lib/socket'
import ConversationList from '@/components/crm/conversation-list'
import ChatArea from '@/components/crm/chat-area'
import CustomerPanel from '@/components/crm/customer-panel'
import Dashboard from '@/components/crm/dashboard'
import AutomationPanel from '@/components/crm/automation-panel'
import NotificationPanel from '@/components/crm/notification-panel'
import ProfilePanel from '@/components/crm/profile-panel'
import SettingsPanel from '@/components/crm/settings-panel'
import { Header } from '@/components/crm/header'
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import ReportsPage from '@/app/reports/page'

function MobileCustomerPanel() {
  const setMobileView = useCRMStore((s) => s.setMobileView)
  const { t } = useT()
  return (
    <div className="md:hidden flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-border/30 glass flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMobileView('chat')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <span className="font-semibold text-sm">{t('tooltip.customerPanel')}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden"><CustomerPanel /></div>
    </div>
  )
}

export default function CRMPageWrapper() {
  return (
    <Suspense>
      <CRMPage />
    </Suspense>
  )
}

function CRMPage() {
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const activeView = useCRMStore((s) => s.activeView)
  const setActiveViewRaw = useCRMStore((s) => s.setActiveView)
  const mobileView = useCRMStore((s) => s.mobileView)
  const router = useRouter()
  const searchParams = useSearchParams()
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const incrementUnread = useCRMStore((s) => s.incrementUnread)
  const addNotification = useCRMStore((s) => s.addNotification)
  const setCurrentUser = useCRMStore((s) => s.setCurrentUser)
  const setAuthenticated = useCRMStore((s) => s.setAuthenticated)
  const openSheet = useCRMStore((s) => s.openSheet)
  const setOpenSheet = useCRMStore((s) => s.setOpenSheet)
  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  const { t } = useT()

  const handleSheetClose = useCallback((open: boolean) => { if (!open) setOpenSheet(null) }, [setOpenSheet])

  // Restore activeView from URL on mount
  useEffect(() => {
    const viewParam = searchParams.get('view')
    if (viewParam && ['inbox', 'dashboard', 'automation', 'reports'].includes(viewParam)) {
      const current = useCRMStore.getState().activeView
      if (current !== viewParam) {
        setActiveViewRaw(viewParam as 'inbox' | 'dashboard' | 'automation' | 'reports')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load current user from API on mount
  const welcomeSentRef = useRef(false)
  useEffect(() => {
    if (useCRMStore.getState().currentUser) return
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(user => {
        setAuthenticated(true)
        setCurrentUser({
          id: user.id, name: user.name, email: user.email,
          phone: user.phone || '', role: user.role, avatar: user.avatar,
          status: user.status || 'online', bio: user.bio || '',
        })
        useCRMStore.getState().initSettingsFromDB(user.settings)
        useCRMStore.getState().loadNotifications()
      })
      .catch(() => { window.location.href = '/login' })
  }, [])

  // Request desktop notification permission & welcome notification
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    if (!welcomeSentRef.current) {
      welcomeSentRef.current = true
      setTimeout(() => {
        addNotification({ type: 'system', title: t('welcome.title'), body: t('welcome.body') })
      }, 1500)
    }
  }, [])

  // Socket: connect/disconnect based on simulation state
  useEffect(() => {
    if (simulationRunning) { socket.connect() } else { socket.disconnect() }
    return () => { socket.disconnect() }
  }, [simulationRunning])

  // Socket: listen for new messages from OTHER conversations
  useEffect(() => {
    const unsub = socket.on('new_messages', (data: { messages: any[] }) => {
      ;(data.messages || []).forEach((msg: any) => {
        if (msg.conversationId !== useCRMStore.getState().selectedConversationId) {
          incrementUnread(msg.conversationId)
          addNotification({
            type: 'new_message', title: t('notif.newMessage'), body: t('notif.newMessageBody'),
            conversationId: msg.conversationId,
          })
        }
      })
    })
    return unsub
  }, [incrementUnread, addNotification])

  const renderInbox = () => (
    <>
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={26} minSize={20} maxSize={40} className="border-r border-border/20">
            <ConversationList />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={selectedConversationId ? 50 : 74} minSize={30}>
            <ChatArea />
          </ResizablePanel>
          {showRightPanel && selectedConversationId && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={24} minSize={20} maxSize={34} className="border-l border-border/20 bg-muted/20">
                <CustomerPanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      <div className="md:hidden flex-1 overflow-hidden">
        {mobileView === 'list' && <div className="h-full min-h-0 mobile-slide-enter"><ConversationList /></div>}
        {mobileView === 'chat' && <div className="h-full min-h-0 mobile-slide-enter"><ChatArea /></div>}
        {mobileView === 'panel' && <div className="h-full min-h-0 mobile-slide-enter"><MobileCustomerPanel /></div>}
      </div>
    </>
  )

  return (
    <div className="h-dvh h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeView === 'inbox' && renderInbox()}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'automation' && <AutomationPanel />}
        {activeView === 'reports' && <ReportsPage />}
      </div>

      <Sheet open={openSheet === 'notifications'} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 rounded-l-2xl">
          <NotificationPanel />
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'profile'} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 rounded-l-2xl">
          <ProfilePanel />
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'settings'} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 rounded-l-2xl">
          <SettingsPanel />
        </SheetContent>
      </Sheet>
    </div>
  )
}
