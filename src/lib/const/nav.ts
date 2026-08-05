// ─── Navigation Constants ───

import type { LucideIcon } from 'lucide-react'
import { Inbox, LayoutDashboard, Zap, BarChart3 } from 'lucide-react'

export type NavView = 'inbox' | 'dashboard' | 'automation' | 'reports'

export const NAV_ITEMS: { key: NavView; labelKey: string; icon: LucideIcon }[] = [
  { key: 'inbox',      labelKey: 'nav.inbox',      icon: Inbox },
  { key: 'dashboard',   labelKey: 'nav.dashboard',   icon: LayoutDashboard },
  { key: 'automation',  labelKey: 'nav.automation',  icon: Zap },
  { key: 'reports',     labelKey: 'nav.reports',     icon: BarChart3 },
]
