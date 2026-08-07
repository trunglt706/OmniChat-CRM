'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { apiPost } from '@/lib/api-client'
import logger from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/translations'
import { NAV_ITEMS, type NavView } from '@/lib/const/nav'
import {
  Headphones, LogOut, User, ChevronDown, Moon, Sun,
  Bell, Globe, Activity, Loader2, Settings, PanelRightClose, PanelRightOpen,
} from 'lucide-react'

export function Header() {
  const { theme, setTheme } = useTheme()
  const totalOpen = useCRMStore((s) => {
    let count = 0
    for (let i = 0; i < s.conversations.length; i++) {
      if (s.conversations[i].status === 'open') count++
    }
    return count
  })
  const activeView = useCRMStore((s) => s.activeView)
  const setActiveViewRaw = useCRMStore((s) => s.setActiveView)
  const router = useRouter()
  const searchParams = useSearchParams()

  const setActiveView = useCallback((v: NavView) => {
    setActiveViewRaw(v)
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'inbox') {
      params.delete('view')
    } else {
      params.set('view', v)
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '/', { scroll: false })
  }, [setActiveViewRaw, router, searchParams])
  const showRightPanel = useCRMStore((s) => s.showRightPanel)
  const setShowRightPanel = useCRMStore((s) => s.setShowRightPanel)
  const currentUser = useCRMStore((s) => s.currentUser)
  const simulationRunning = useCRMStore((s) => s.simulationRunning)
  const setSimulationRunning = useCRMStore((s) => s.setSimulationRunning)
  const unreadNotifCount = useCRMStore((s) => {
    let c = 0
    for (let i = 0; i < s.notifications.length; i++) {
      if (!s.notifications[i].read) c++
    }
    return c
  })
  const setOpenSheet = useCRMStore((s) => s.setOpenSheet)
  const settings = useCRMStore((s) => s.settings)
  const updateSettings = useCRMStore((s) => s.updateSettings)
  const [mounted, setMounted] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { t } = useT()
  useEffect(() => { setMounted(true) }, [])

  const navItems = useMemo(() => NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey) })), [t])

  const toggleSimulation = async () => {
    setSimLoading(true)
    try {
      if (simulationRunning) {
        await apiPost('/api/simulation', { action: 'stop_auto' })
        setSimulationRunning(false)
      } else {
        await apiPost('/api/simulation', { action: 'start_auto' })
        setSimulationRunning(true)
      }
    } catch (e) { logger.error('Simulation error', { context: 'Header', error: e }) }
    finally { setSimLoading(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/mock/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/login'
  }

  const roleLabel = currentUser?.role === 'admin' ? t('user.role.admin') : currentUser?.role === 'supervisor' ? t('user.role.supervisor') : currentUser?.role === 'agent' ? t('user.role.agent') : currentUser?.role || t('common.agent')

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
                )}>
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
        {/* Language switcher */}
        <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as Locale })}>
          <SelectTrigger className="h-7 w-16 md:w-20 rounded-lg text-[11px] gap-1 border-0 bg-transparent hover:bg-foreground/[0.04] focus:ring-0 px-1.5">
            <Globe className="h-3 w-3 text-muted-foreground/50" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((loc) => (
              <SelectItem key={loc} value={loc} className="text-xs">
                {LOCALE_LABELS[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
                disabled={simLoading}>
                {simLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{simulationRunning ? t('tooltip.stopSimulation') : t('tooltip.startSimulation')}</TooltipContent>
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
                onClick={() => setOpenSheet('notifications')}>
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm shadow-rose-500/30 animate-scale-bounce">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltip.notifications')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {mounted && (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{mounted ? (theme === 'dark' ? t('tooltip.lightMode') : t('tooltip.darkMode')) : ''}</TooltipContent>
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
              <TooltipContent>{t('tooltip.customerPanel')}</TooltipContent>
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
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />}
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
                <span className="text-xs font-semibold leading-tight">{currentUser?.name || t('common.user')}</span>
                <span className="text-[10px] text-muted-foreground/50 leading-tight font-medium">{roleLabel}</span>
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
            <DropdownMenuItem className="rounded-lg text-xs py-2.5" onClick={() => window.location.href = '/settings?tab=profile'}>
              <User className="h-3.5 w-3.5 mr-2.5" /> {t('user.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-xs py-2.5" onClick={() => window.location.href = '/settings?tab=system'}>
              <Settings className="h-3.5 w-3.5 mr-2.5" /> {t('user.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg text-xs py-2.5 text-destructive focus:text-destructive"
              onClick={() => setShowLogoutDialog(true)}>
              <LogOut className="h-3.5 w-3.5 mr-2.5" /> {t('user.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent className="rounded-2xl max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">{t('logout.title')}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground/70">
                {t('logout.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl h-9 text-xs font-medium" disabled={loggingOut}>{t('logout.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl h-9 text-xs font-medium bg-destructive hover:bg-destructive/90">
                {loggingOut ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1.5" />}
                {t('logout.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}