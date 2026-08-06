// ─── Settings Page Constants ───

import type { UserProfile } from '@/store/crm-store'
import type { LucideIcon } from 'lucide-react'
import {
  User, Settings, MessageSquare, Users, ShieldAlert, Database,
  MessageSquareOff, Phone, Send, Mail, Globe2,
} from 'lucide-react'

// ── Tab navigation ──
export const SETTINGS_TABS = [
  { key: 'profile',  labelKey: 'settingsTab.profile',  icon: User },
  { key: 'system',   labelKey: 'settingsTab.system',   icon: Settings },
  { key: 'channels', labelKey: 'settingsTab.channels', icon: MessageSquare },
  { key: 'staff',    labelKey: 'settingsTab.staff',    icon: Users },
  { key: 'seo',      labelKey: 'settingsTab.seo',      icon: Globe2 },
  { key: 'security', labelKey: 'settingsTab.security', icon: ShieldAlert },
  { key: 'backup',   labelKey: 'settingsTab.backup',   icon: Database },
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]['key']

// ── System Time Config ──
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'UTC', label: 'UTC' },
] as const

export const TIME_FORMAT_OPTIONS = [
  { value: 'dd/MM/yyyy HH:mm', label: '24/12/2026 15:30 (24h)' },
  { value: 'MM/dd/yyyy hh:mm a', label: '12/24/2026 03:30 PM (12h)' },
  { value: 'yyyy-MM-dd HH:mm', label: '2026-12-24 15:30' },
] as const

// ── Profile ──
export const GRADIENT_CLASSES = [
  'avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3',
  'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6',
]

export const STATUS_OPTIONS: {
  value: UserProfile['status']
  labelKey: string
  color: string
}[] = [
  { value: 'online',  labelKey: 'profile.status.online',  color: 'bg-emerald-500' },
  { value: 'busy',    labelKey: 'profile.status.busy',    color: 'bg-amber-500' },
  { value: 'away',    labelKey: 'profile.status.away',    color: 'bg-orange-400' },
  { value: 'offline', labelKey: 'profile.status.offline', color: 'bg-gray-400' },
]

// ── Channels ──
export interface ChannelData {
  key: string
  enabled: boolean
  configured: boolean
  config: Record<string, string>
  fields: { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder: string }[]
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastTestMsg: string | null
}

export const CHANNEL_ICONS: Record<string, LucideIcon> = {
  facebook_messenger: MessageSquare,
  facebook_comment:   MessageSquareOff,
  zalo:               Phone,
  telegram:           Send,
  chatwork:           Users,
  website:            Globe2,
  email:              Mail,
}

export const CHANNEL_COLORS_MAP: Record<string, string> = {
  facebook_messenger: '#1877f2',
  facebook_comment:   '#1877f2',
  zalo:               '#0068ff',
  telegram:           '#26a5e4',
  chatwork:           '#ee2224',
  website:            '#10b981',
  email:              '#ea4335',
}

export const CHANNEL_NAME_KEYS: Record<string, string> = {
  facebook_messenger: 'channels.fb.name',
  facebook_comment:   'channels.fbc.name',
  zalo:               'channels.zalo.name',
  telegram:           'channels.tg.name',
  chatwork:           'channels.cw.name',
  website:            'channels.web.name',
  email:              'channels.email.name',
}

export const CHANNEL_DESC_KEYS: Record<string, string> = {
  facebook_messenger: 'channels.fb.desc',
  facebook_comment:   'channels.fbc.desc',
  zalo:               'channels.zalo.desc',
  telegram:           'channels.tg.desc',
  chatwork:           'channels.cw.desc',
  website:            'channels.web.desc',
  email:              'channels.email.desc',
}
