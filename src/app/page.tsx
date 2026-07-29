'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Inbox, LayoutDashboard, Zap,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

function Header() {
  const { theme, setTheme } = useTheme()
  const [showRightPanel, setShowRightPanel] = useState(true)
  const totalOpen = useCRMStore((s) => s.conversations.filter(c => c.status === 'open').length)
  const activeView = useCRMStore((s) => s.activeView)
  const setActiveView = useCRMStore((s) => s.setActiveView)

  const navItems: { key: 'inbox' | 'dashboard' | 'automation'; label: string; icon: React.ElementType }[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'automation', label: 'Automation', icon: Zap },
  ]

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
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeView === item.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
                {item.key === 'inbox' && totalOpen > 0 && (
                  <Badge className={cn('h-4 px-1 text-[10px] min-w-4 justify-center', activeView === 'inbox' ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground')}>
                    {totalOpen}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1">
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

        {activeView === 'inbox' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                >
                  {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Thông tin khách hàng</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">MT</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium hidden sm:inline">Phạm Minh Tuấn</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem><User className="h-3.5 w-3.5 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="h-3.5 w-3.5 mr-2" /> Cài đặt</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default function CRMPage() {
  const [showRightPanel, setShowRightPanel] = useState(true)
  const selectedConversationId = useCRMStore((s) => s.selectedConversationId)
  const activeView = useCRMStore((s) => s.activeView)

  // WebSocket for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return
    let socket: ReturnType<typeof import('socket.io-client').io> | null = null

    const connectWs = async () => {
      try {
        const { io } = await import('socket.io-client')
        socket = io('/?XTransformPort=3003')
        socket.on('new_message', (data: { conversationId: string; message: unknown }) => {
          // Refresh conversation list when new message arrives
          const event = new CustomEvent('crm:new_message', { detail: data })
          window.dispatchEvent(event)
        })
        socket.on('conversation_update', (data: { conversationId: string }) => {
          const event = new CustomEvent('crm:conversation_update', { detail: data })
          window.dispatchEvent(event)
        })
      } catch (e) {
        // WebSocket not available, gracefully degrade
      }
    }
    connectWs()
    return () => { socket?.disconnect() }
  }, [])

  // Render Inbox view (3-column layout)
  if (activeView === 'inbox') {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden">
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
      </div>
    )
  }

  // Render Dashboard or Automation view (full width)
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'automation' && <AutomationPanel />}
      </div>
    </div>
  )
}