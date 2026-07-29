'use client'

import { useEffect, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import ConversationList from '@/components/crm/conversation-list'
import ChatArea from '@/components/crm/chat-area'
import CustomerPanel from '@/components/crm/customer-panel'
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
  Bell, Search, Settings, Menu, X, PanelRightClose, PanelRightOpen,
  Headphones, LogOut, User, ChevronDown, Moon, Sun,
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

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-3 bg-background flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Headphones className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight">OmniChat</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">MVP</Badge>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Unread count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                {totalOpen > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                    {totalOpen}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hội thoại đang mở</TooltipContent>
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

        {/* Right panel toggle */}
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

        {/* Current user */}
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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Conversation List */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="border-r border-border">
            <ConversationList />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Panel - Chat Area */}
          <ResizablePanel defaultSize={selectedConversationId ? 50 : 75} minSize={30}>
            <ChatArea />
          </ResizablePanel>

          {/* Right Panel - Customer Info */}
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