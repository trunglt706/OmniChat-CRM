'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Settings, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { SETTINGS_TABS, type SettingsTab } from '@/lib/const/setting'
import ProfileTab from './profile-tab'
import SystemTab from './system-tab'
import ChannelsTab from './channels-tab'
import StaffTab from './staff-tab'
import SecurityTab from './security-tab'
import BackupTab from './backup-tab'

const TAB_COMPONENTS: Record<SettingsTab, React.ComponentType> = {
  profile: ProfileTab,
  system: SystemTab,
  channels: ChannelsTab,
  staff: StaffTab,
  security: SecurityTab,
  backup: BackupTab,
}

export default function SettingsPageWrapper() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  )
}

function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()
  const setCurrentUser = useCRMStore((s) => s.setCurrentUser)
  const setAuthenticated = useCRMStore((s) => s.setAuthenticated)

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'system', 'channels', 'staff', 'security', 'backup'].includes(tabParam)) {
      return tabParam as SettingsTab
    }
    return 'profile'
  })

  // Load current user on mount (skip if already loaded)
  useState(() => {
    if (useCRMStore.getState().currentUser) {
      setAuthenticated(true)
      return
    }
    fetch('/api/auth/me')
      .then(res => { if (!res.ok) throw new Error('Not authenticated'); return res.json() })
      .then(user => {
        setAuthenticated(true)
        setCurrentUser({
          id: user.id, name: user.name, email: user.email,
          phone: user.phone || '', role: user.role, avatar: user.avatar,
          status: user.status || 'online', bio: user.bio || '',
        })
        if (user.settings) {
          const { initSettingsFromDB } = useCRMStore.getState()
          initSettingsFromDB(typeof user.settings === 'string' ? user.settings : JSON.stringify(user.settings))
        }
      })
      .catch(() => { window.location.href = '/login' })
  })

  const ActiveTabComponent = TAB_COMPONENTS[activeTab]

  return (
    <div className="h-dvh h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-12 md:h-14 border-b border-border/30 glass flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-foreground/5" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">{t('settingsPage.title')}</h1>
              <p className="text-[10px] text-muted-foreground/50 font-medium hidden sm:block">{t('settingsPage.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
        {/* Desktop sidebar nav */}
        <nav className="hidden md:flex w-56 md:w-64 border-r border-border/20 flex-shrink-0 flex-col p-3 space-y-1 overflow-y-auto">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-250', active ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-primary border border-primary/10' : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.03] border border-transparent')}>
                <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                {t(tab.labelKey)}
              </button>
            )
          })}
        </nav>
        {/* Mobile horizontal nav */}
        <div className="md:hidden flex-shrink-0 border-b border-border/20 flex overflow-x-auto scrollbar-none">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all duration-250 border-b-2 flex-shrink-0', active ? 'text-primary border-primary' : 'text-muted-foreground/60 border-transparent hover:text-foreground')}>
                <Icon className="h-3.5 w-3.5" />
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
        {/* Tab content — rendered once, shared by desktop & mobile */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto"><ActiveTabComponent /></div>
        </main>
      </div>
    </div>
  )
}
