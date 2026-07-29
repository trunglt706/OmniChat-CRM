'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  Bell, Settings, PanelRightClose, PanelRightOpen,
  Headphones, LogOut, User, ChevronDown, Moon, Sun,
  Inbox, LayoutDashboard, Zap, Radio,
  Loader2,
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
        await fetch('/api/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop_auto' }),
        })
        setSimulationRunning(false)
      } else {
        await fetch('/api/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_auto' }),
        })
        setSimulationRunning(true)
      }
    } catch (e) {
      console.error('Simulation error', e)
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-3 bg-background flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Headphones className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">OmniChat</span>
        </div>
        {/* Nav tabs */}
        <div className="flex items-center gap-1 ml-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                  activeView === item.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
                {item.key === 'inbox' && totalOpen > 0 && (
                  <Badge className={cn('h-4 px-1 text-[10px] min-w-4 justify-center transition-transform', activeView === 'inbox' ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground')}>
                    {totalOpen}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Simulation toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={simulationRunning ? 'default' : 'outline'}
                size="icon"
                className={cn('h-8 w-8', simulationRunning && 'bg-emerald-600 hover:bg-emerald-700')}
                onClick={toggleSimulation}
                disabled={simLoading}
              >
                {simLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : simulationRunning ? (
                  <Radio className="h-4 w-4" />
                ) : (
                  <Radio className="h-4 w-4 opacity-40" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {simulationRunning ? 'Dừng mô phỏng realtime' : 'Bắt đầu mô phỏng realtime'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Panel toggle (desktop only) */}
        {activeView === 'inbox' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 hidden md:flex"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                >
                  {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Thông tin khách hàng</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {currentUser?.name?.split(' ').slice(-2).map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium hidden sm:inline">{currentUser?.name || 'User'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem><User className="h-3.5 w-3.5 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="h-3.5 w-3.5 mr-2" /> Cài đặt</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/api/auth/signout'}>
              <LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function MobileCustomerPanel() {
  const { setMobileView, selectedConversationId } = useCRMStore()
  if (!selectedConversationId) return null
  return (
    <div className="md:hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('chat')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <span className="font-semibold text-sm">Thông tin khách hàng</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <CustomerPanel />
      </div>
    </div>
  )
}

export default function CRMPage() {
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const activeView = useCRMStore((s) => s.activeView)
  const mobileView = useCRMStore((s) => s.mobileView)
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const addMessage = useCRMStore((s) => s.addMessage)
  const incrementUnread = useCRMStore((s) => s.incrementUnread)
  const sseRef = useRef<EventSource | null>(null)

  // SSE connection for real-time simulation updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const connectSSE = () => {
      const evtSource = new EventSource('/api/simulation')
      sseRef.current = evtSource

      evtSource.addEventListener('new_messages', (e) => {
        try {
          const data = JSON.parse(e.data)
          const msgs: Message[] = data.messages || []
          msgs.forEach((msg: any) => {
            // Dispatch to update conversation list
            window.dispatchEvent(new CustomEvent('crm:conversation_update', {
              detail: { conversationId: msg.conversationId }
            }))
            // Increment unread count for conversations not currently selected
            const selectedId = useCRMStore.getState().selectedConversationId
            if (msg.conversationId !== selectedId) {
              incrementUnread(msg.conversationId)
            }
          })
        } catch {}
      })

      evtSource.onerror = () => {
 evtSource.close()
        // Reconnect after 3s
        setTimeout(connectSSE, 3000)
      }
    }

    // Only connect SSE when simulation is running
    const simulationRunning = useCRMStore.getState().simulationRunning
    if (simulationRunning) connectSSE()

    return () => {
      sseRef.current?.close()
    }
  }, []) // Connect once on mount

  // Manage SSE lifecycle based on simulation state
  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  useEffect(() => {
    if (simulationRunning && !sseRef.current) {
      const evtSource = new EventSource('/api/simulation')
      sseRef.current = evtSource
      evtSource.addEventListener('new_messages', (e) => {
        try {
          const data = JSON.parse(e.data)
          const msgs: Message[] = data.messages || []
          msgs.forEach((msg: any) => {
            window.dispatchEvent(new CustomEvent('crm:conversation_update', {
              detail: { conversationId: msg.conversationId }
            }))
            const selectedId = useCRMStore.getState().selectedConversationId
            if (msg.conversationId !== selectedId) {
              incrementUnread(msg.conversationId)
            }
          })
        } catch {}
      })
      evtSource.onerror = () => { evtSource.close(); sseRef.current = null }
    } else if (!simulationRunning && sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
  }, [simulationRunning, incrementUnread])

  // Desktop: 3-column resizable layout
  // Mobile: single panel with slide transitions
  const renderInbox = () => {
    return (
      <>
        {/* Desktop layout */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="border-r border-border">
              <ConversationList />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={selectedConversationId ? 50 : 75} minSize={30}>
              <ChatArea />
            </ResizablePanel>
            {showRightPanel && selectedConversationId && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l border-border bg-muted/20">
                  <CustomerPanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden flex-1 overflow-hidden">
          {mobileView === 'list' && (
            <div className="h-full mobile-slide-enter">
              <ConversationList />
            </div>
          )}
          {mobileView === 'chat' && (
            <div className="h-full mobile-slide-enter">
              <ChatArea />
            </div>
          )}
          {mobileView === 'panel' && (
            <div className="h-full mobile-slide-enter">
              <MobileCustomerPanel />
            </div>
          )}
        </div>
      </>
    )
  }

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
