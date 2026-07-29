'use client'

import { useEffect, useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import ConversationList from '@/components/crm/conversation-list'
import ChatArea from '@/components/crm/chat-area'
import CustomerPanel from '@/components/crm/customer-panel'
import Dashboard from '@/components/crm/dashboard'
import AutomationPanel from '@/components/crm/automation-panel'
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
  Settings, PanelRightClose, PanelRightOpen,
  Headphones, LogOut, User, ChevronDown, Moon, Sun,
  Inbox, LayoutDashboard, Zap, Radio,
  Loader2, Activity,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

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
  const [simLoading, setSimLoading] = useState(false)

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

  return (
    <header className="h-14 border-b border-border/30 glass flex items-center justify-between px-4 flex-shrink-0 z-50">
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30">
            <Headphones className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">OmniChat</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block" />

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

      <div className="flex items-center gap-1">
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
            <TooltipContent>{simulationRunning ? 'Dừng mô phỏng' : 'Bắt đầu mô phỏng realtime'}</TooltipContent>
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
              <TooltipContent>Thông tin khách hàng</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border/30 mx-0.5" />

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 pl-1 pr-2 gap-2 rounded-xl hover:bg-foreground/[0.04] transition-all duration-200">
              <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
                  {currentUser?.name?.split(' ').slice(-2).map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-semibold leading-tight">{currentUser?.name || 'User'}</span>
                <span className="text-[10px] text-muted-foreground/50 leading-tight font-medium">Admin</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
            <DropdownMenuItem className="rounded-lg text-xs py-2"><User className="h-3.5 w-3.5 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-xs py-2"><Settings className="h-3.5 w-3.5 mr-2" /> Cài đặt</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg text-xs py-2 text-destructive focus:text-destructive" onClick={() => window.location.href = '/api/auth/signout'}>
              <LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function MobileCustomerPanel() {
  const { setMobileView } = useCRMStore()
  return (
    <div className="md:hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 glass flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMobileView('chat')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <span className="font-semibold text-sm">Thông tin khách hàng</span>
      </div>
      <div className="flex-1 overflow-hidden"><CustomerPanel /></div>
    </div>
  )
}

export default function CRMPage() {
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const activeView = useCRMStore((s) => s.activeView)
  const mobileView = useCRMStore((s) => s.mobileView)
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const incrementUnread = useCRMStore((s) => s.incrementUnread)
  const sseRef = useRef<EventSource | null>(null)

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
            if (msg.conversationId !== useCRMStore.getState().selectedConversationId) incrementUnread(msg.conversationId)
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
            if (msg.conversationId !== useCRMStore.getState().selectedConversationId) incrementUnread(msg.conversationId)
          })
        } catch {}
      })
      es.onerror = () => { es.close(); sseRef.current = null }
    } else if (!simulationRunning && sseRef.current) {
      sseRef.current.close(); sseRef.current = null
    }
  }, [simulationRunning, incrementUnread])

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
        {mobileView === 'list' && <div className="h-full mobile-slide-enter"><ConversationList /></div>}
        {mobileView === 'chat' && <div className="h-full mobile-slide-enter"><ChatArea /></div>}
        {mobileView === 'panel' && <div className="h-full mobile-slide-enter"><MobileCustomerPanel /></div>}
      </div>
    </>
  )

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        {activeView === 'inbox' && renderInbox()}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'automation' && <AutomationPanel />}
      </div>
    </div>
  )
}