// ─── Reports Page Constants ───

import type { LucideIcon } from 'lucide-react'
import {
  MessageSquare, CheckCircle, Clock, Star, Shield,
  Timer, BarChart3, Zap, TrendingUp, Bot, Tag,
} from 'lucide-react'
import { vi as dateVi, enUS as dateEn, zhCN as dateZhCN } from 'date-fns/locale'

// ── Types ──
export type ReportTab =
  | 'conversations'
  | 'agents'
  | 'sla'
  | 'channels'
  | 'customers'
  | 'messages'
  | 'responseTime'
  | 'botPerformance'
  | 'tags'
  | 'resolutionTrends'

export type PresetKey = 'today' | '7' | '30' | 'thisMonth' | 'lastMonth' | 'custom'

export interface DetailView {
  type: string
  id: string | number
  label: string
}

export type TFn = (key: string, opts?: Record<string, string | number>) => string

// ── Date locale helper ──
export function getDateLocale(locale: string) {
  switch (locale) {
    case 'en': return dateEn
    case 'zh': return dateZhCN
    default: return dateVi
  }
}

// ── Tab navigation ──
export const REPORT_TABS: { key: ReportTab; labelKey: string; icon: LucideIcon }[] = [
  { key: 'conversations',    labelKey: 'reports.tab.conversations',    icon: MessageSquare },
  { key: 'agents',           labelKey: 'reports.tab.agents',           icon: Star },
  { key: 'responseTime',     labelKey: 'reports.tab.responseTime',     icon: Timer },
  { key: 'channels',         labelKey: 'reports.tab.channels',         icon: BarChart3 },
  { key: 'customers',        labelKey: 'reports.tab.customers',        icon: Zap },
  { key: 'messages',         labelKey: 'reports.tab.messages',         icon: TrendingUp },
  { key: 'sla',              labelKey: 'reports.tab.sla',              icon: Shield },
  { key: 'botPerformance',   labelKey: 'reports.tab.botPerformance',   icon: Bot },
  { key: 'tags',             labelKey: 'reports.tab.tags',             icon: Tag },
  { key: 'resolutionTrends', labelKey: 'reports.tab.resolutionTrends', icon: CheckCircle },
]

// ── Tabs that contain charts (PNG export) ──
export const CHART_TABS: ReportTab[] = ['messages', 'responseTime', 'resolutionTrends']

// ── Summary stat cards ──
export const SUMMARY_CARDS = [
  { labelKey: 'reports.summary.conversations', icon: MessageSquare, gradient: 'bg-gradient-to-br from-violet-500 to-purple-600' },
  { labelKey: 'reports.summary.resolved',      icon: CheckCircle,   gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  { labelKey: 'reports.summary.avgResponse',   icon: Clock,         gradient: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  { labelKey: 'reports.summary.satisfaction',  icon: Star,          gradient: 'bg-gradient-to-br from-rose-500 to-pink-600' },
  { labelKey: 'reports.summary.slaCompliance', icon: Shield,        gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
] as const

// ── Bot Performance metric label keys ──
export const BOT_METRIC_KEYS: Record<string, string> = {
  totalHandled:       'reports.botPerformance.totalHandled',
  handoffRate:        'reports.botPerformance.handoffRate',
  avgResolutionTime:  'reports.botPerformance.avgResolutionTime',
  customerSatisfaction: 'reports.botPerformance.customerSatisfaction',
  conversationsSaved: 'reports.botPerformance.conversationsSaved',
  accuracy:           'reports.botPerformance.accuracy',
}

// ── Response time percentile stat config ──
export const RESPONSE_TIME_STATS = [
  { labelKey: 'reports.responseTime.avgLabel', valueKey: 'avg' as const, color: 'from-blue-500 to-cyan-500' },
  { labelKey: 'reports.responseTime.p50',       valueKey: 'p50' as const, color: 'from-emerald-500 to-teal-500' },
  { labelKey: 'reports.responseTime.p90',       valueKey: 'p90' as const, color: 'from-amber-500 to-orange-500' },
  { labelKey: 'reports.responseTime.p99',       valueKey: 'p99' as const, color: 'from-rose-500 to-pink-500' },
] as const

// ── Preset definitions ──
export const DATE_PRESETS: { key: PresetKey; labelKey: string }[] = [
  { key: 'today',     labelKey: 'reports.today' },
  { key: '7',         labelKey: 'reports.7days' },
  { key: '30',        labelKey: 'reports.30days' },
  { key: 'thisMonth', labelKey: 'reports.thisMonth' },
  { key: 'lastMonth', labelKey: 'reports.lastMonth' },
  { key: 'custom',    labelKey: 'reports.custom' },
]
