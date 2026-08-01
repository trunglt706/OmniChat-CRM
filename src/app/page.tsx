'use client'

import { useEffect, useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import ConversationList from '@/components/crm/conversation-list'
import ChatArea from '@/components/crm/chat-area'
import CustomerPanel from '@/components/crm/customer-panel'
import Dashboard from '@/components/crm/dashboard'
import AutomationPanel from '@/components/crm/automation-panel'
import NotificationPanel from '@/components/crm/notification-panel'
import ProfilePanel from '@/components/crm/profile-panel'
import SettingsPanel from '@/components/crm/settings-panel'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Settings, PanelRightClose, PanelRightOpen,
  Headphones, LogOut, User, ChevronDown, Moon, Sun,
  Inbox, LayoutDashboard, Zap,
  Loader2, Activity, Bell,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

function Header() {
  const { theme, setTheme } = useTheme()
  const totalOpen = useCRMStore((s) => s.conversations.filter(c => c.status === 'open').length)
  const activeView = useCRMStore((s) => s.activeView)
  const setActiveView = useCRMStore((s) => s.setActiveView)
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const setShowRightPanel = useCRMStore((s) => s.setShowRightPanel)
  const currentUser = useCRMStore((s) => s.currentUser)
  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  const setSimulationRunning = useCRMStore((s) => s.setSimulationRunning)
  const notifications = useCRMStore((s) => s.notifications)
  const openSheet = useCRMStore((s) => s.openSheet)
  const setOpenSheet = useCRMStore((s) => s.setOpenSheet)
  const [simLoading, setSimLoading] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const unreadNotifCount = notifications.filter(n => !n.read).length

  const navItems: { key: 'inbox' | 'dashboard' | 'automation'; label: string; icon: React.ElementType }[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'automation', label: 'Automation', icon: Zap },
  ]

  const toggleSimulation = async () => {
    setSimLoading(true)
    try {
      if (simulationRunning) {
        await fetch('/api/simulation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop_auto' }) })
        setSimulationRunning(false)
      } else {
        await fetch('/api/simulation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start_auto' }) })
        setSimulationRunning(true)
      }
    } catch (e) { console.error('Simulation error', e) }
    finally { setSimLoading(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut({ callbackUrl: '/login' })
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <header className="h-12 md:h-14 border-b border-border/30 glass flex items-center justify-between px-2 md:px-4 flex-shrink-0 z-50">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30">
            <Headphones className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">OmniChat</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block flex-shrink-0" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 p-0.5 bg-foreground/[0.03] rounded-xl">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeView === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-250',
                  active
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.03]'
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/25 animate-scale-in" />
                )}
                <Icon className="h-3.5 w-3.5 relative z-10" />
                <span className="hidden md:inline relative z-10">{item.label}</span>
                {item.key === 'inbox' && totalOpen > 0 && (
                  <span className={cn(
                    'relative z-10 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-250',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                  )}>
                    {totalOpen}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
        {/* Simulation toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={simulationRunning ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-xl transition-all duration-300',
                  simulationRunning
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 animate-breathe'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5'
                )}
                onClick={toggleSimulation}
                disabled={simLoading}
              >
                {simLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{simulationRunning ? 'Dung mo phong' : 'Bat dau mo phong realtime'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notification Bell */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                onClick={() => setOpenSheet('notifications')}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm shadow-rose-500/30 animate-scale-bounce">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thong bao</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {activeView === 'inbox' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hidden md:flex text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200" onClick={() => setShowRightPanel(!showRightPanel)}>
                  {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Thong tin khach hang</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border/30 mx-0.5" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 pl-1 pr-2 gap-2 rounded-xl hover:bg-foreground/[0.04] transition-all duration-200">
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
                    {currentUser?.name?.split(' ').slice(-2).map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                  currentUser?.status === 'online' ? 'bg-emerald-500' : currentUser?.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                )} />
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-semibold leading-tight">{currentUser?.name || 'User'}</span>
                <span className="text-[10px] text-muted-foreground/50 leading-tight font-medium">{currentUser?.role === 'admin' ? 'Quan tri vien' : currentUser?.role || 'Agent'}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            <div className="px-2 py-1.5 mb-1">
              <p className="text-xs font-semibold truncate">{currentUser?.name}</p>
              <p className="text-[11px] text-muted-foreground/60 truncate">{currentUser?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg text-xs py-2.5" onClick={() => setOpenSheet('profile')}>
              <User className="h-3.5 w-3.5 mr-2.5" /> Ho so cua toi
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-xs py-2.5" onClick={() => setOpenSheet('settings')}>
              <Settings className="h-3.5 w-3.5 mr-2.5" /> Cai dat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg text-xs py-2.5 text-destructive focus:text-destructive"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="h-3.5 w-3.5 mr-2.5" /> Dang xuat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent className="rounded-2xl max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Xac nhan dang xuat</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground/70">
                Ban co chac chan muon dang xuat khong? Cac hoi thoai chua xu ly se van duoc giu nguyen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl h-9 text-xs font-medium" disabled={loggingOut}>Huy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl h-9 text-xs font-medium bg-destructive hover:bg-destructive/90"
              >
                {loggingOut ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1.5" />}
                Dang xuat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}

function MobileCustomerPanel() {
  const { setMobileView } = useCRMStore()
  return (
    <div className="md:hidden flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-border/30 glass flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMobileView('chat')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <span className="font-semibold text-sm">Thong tin khach hang</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden"><CustomerPanel /></div>
    </div>
  )
}

export default function CRMPage() {
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const activeView = useCRMStore((s) => s.activeView)
  const mobileView = useCRMStore((s) => s.mobileView)
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const incrementUnread = useCRMStore((s) => s.incrementUnread)
  const addNotification = useCRMStore((s) => s.addNotification)
  const openSheet = useCRMStore((s) => s.openSheet)
  const setOpenSheet = useCRMStore((s) => s.setOpenSheet)
  const sseRef = useRef<EventSource | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omnichat_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        useCRMStore.getState().updateSettings(parsed)
      }
    } catch {}

    // Request desktop notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    // Welcome notification
    setTimeout(() => {
      addNotification({
        type: 'system',
        title: 'Chao mung ban quay lai!',
        body: 'OmniChat CRM san sang phuc vu ban.',
      })
    }, 1500)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const connectSSE = () => {
      const es = new EventSource('/api/simulation')
      sseRef.current = es
      es.addEventListener('new_messages', (e) => {
        try {
          const data = JSON.parse(e.data)
          ;(data.messages || []).forEach((msg: any) => {
            window.dispatchEvent(new CustomEvent('crm:conversation_update', { detail: { conversationId: msg.conversationId } }))
            if (msg.conversationId !== useCRMStore.getState().selectedConversationId) {
              incrementUnread(msg.conversationId)
              addNotification({
                type: 'new_message',
                title: 'Tin nhan moi',
                body: 'Ban co tin nhan moi tu khach hang',
                conversationId: msg.conversationId,
              })
            }
          })
        } catch {}
      })
      es.onerror = () => { es.close(); setTimeout(connectSSE, 3000) }
    }
    if (useCRMStore.getState().simulationRunning) connectSSE()
    return () => { sseRef.current?.close() }
  }, [])

  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  useEffect(() => {
    if (simulationRunning && !sseRef.current) {
      const es = new EventSource('/api/simulation')
      sseRef.current = es
      es.addEventListener('new_messages', (e) => {
        try {
          const data = JSON.parse(e.data)
          ;(data.messages || []).forEach((msg: any) => {
            window.dispatchEvent(new CustomEvent('crm:conversation_update', { detail: { conversationId: msg.conversationId } }))
            if (msg.conversationId !== useCRMStore.getState().selectedConversationId) {
              incrementUnread(msg.conversationId)
              addNotification({
                type: 'new_message',
                title: 'Tin nhan moi',
                body: 'Ban co tin nhan moi tu khach hang',
                conversationId: msg.conversationId,
              })
            }
          })
        } catch {}
      })
      es.onerror = () => { es.close(); sseRef.current = null }
    } else if (!simulationRunning && sseRef.current) {
      sseRef.current.close(); sseRef.current = null
    }
  }, [simulationRunning, incrementUnread, addNotification])

  const renderInbox = () => (
    <>
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={26} minSize={20} maxSize={40} className="relative border-r border-border/20">
            <div className="absolute inset-0"><ConversationList /></div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={selectedConversationId ? 50 : 74} minSize={30} className="relative">
            <div className="absolute inset-0"><ChatArea /></div>
          </ResizablePanel>
          {showRightPanel && selectedConversationId && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={24} minSize={20} maxSize={34} className="relative border-l border-border/20 bg-muted/20">
                <div className="absolute inset-0"><CustomerPanel /></div>
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
      </div>

      {/* Notification Sheet */}
      <Sheet open={openSheet === 'notifications'} onOpenChange={(open) => { if (!open) setOpenSheet(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 rounded-l-2xl">
          <NotificationPanel />
        </SheetContent>
      </Sheet>

      {/* Profile Sheet */}
      <Sheet open={openSheet === 'profile'} onOpenChange={(open) => { if (!open) setOpenSheet(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 rounded-l-2xl">
          <ProfilePanel />
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={openSheet === 'settings'} onOpenChange={(open) => { if (!open) setOpenSheet(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 rounded-l-2xl">
          <SettingsPanel />
        </SheetContent>
      </Sheet>
    </div>
  )
}