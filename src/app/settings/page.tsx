'use client'

import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCRMStore, type UserProfile } from '@/store/crm-store'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiPut, apiPost, apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { CHANNEL_CONFIG, type Agent } from '@/lib/types'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/translations'
import {
  ArrowLeft, User, Settings, MessageSquare, Users, Moon, Sun,
  Volume2, Monitor, Mail, Maximize2, Eye, Globe, UserCheck,
  Camera, Check, X, Shield, Clock, MessageSquareOff, Phone,
  Send, Trash2, RotateCcw, Pencil, MoreVertical, Plus, Bell,
  Globe2, ChevronDown, Star, ShieldAlert, Database, Download,
  Upload, RefreshCw, Ban, AlertTriangle, Loader2, Zap, HardDrive,
} from 'lucide-react'

const SETTINGS_TABS = [
  { key: 'profile', labelKey: 'settingsTab.profile', icon: User },
  { key: 'system', labelKey: 'settingsTab.system', icon: Settings },
  { key: 'channels', labelKey: 'settingsTab.channels', icon: MessageSquare },
  { key: 'staff', labelKey: 'settingsTab.staff', icon: Users },
  { key: 'security', labelKey: 'settingsTab.security', icon: ShieldAlert },
  { key: 'backup', labelKey: 'settingsTab.backup', icon: Database },
] as const

type SettingsTab = (typeof SETTINGS_TABS)[number]['key']

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6']

// ═══ Shared fetch cache (prevents duplicate API calls across mounts) ═══
const fetchCache = new Map<string, { promise: Promise<any>; ts: number }>()
const CACHE_TTL = 5000
function cachedFetch(url: string, opts?: { forceFresh?: boolean }): Promise<any> {
  const now = Date.now()
  if (!opts?.forceFresh) {
    const cached = fetchCache.get(url)
    if (cached && now - cached.ts < CACHE_TTL) return cached.promise
  }
  const promise = fetch(url).then(r => r.ok ? r.json() : null)
  fetchCache.set(url, { promise, ts: now })
  return promise
}

const STATUS_OPTIONS: { value: UserProfile['status']; labelKey: string; color: string }[] = [
  { value: 'online', labelKey: 'profile.status.online', color: 'bg-emerald-500' },
  { value: 'busy', labelKey: 'profile.status.busy', color: 'bg-amber-500' },
  { value: 'away', labelKey: 'profile.status.away', color: 'bg-orange-400' },
  { value: 'offline', labelKey: 'profile.status.offline', color: 'bg-gray-400' },
]

// Channel data shape returned from /api/channels
interface ChannelData {
  key: string
  enabled: boolean
  configured: boolean
  config: Record<string, string>
  fields: { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder: string }[]
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastTestMsg: string | null
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  facebook_messenger: MessageSquare,
  facebook_comment: MessageSquareOff,
  zalo: Phone,
  telegram: Send,
  chatwork: Users,
  website: Globe2,
  email: Mail,
}

const CHANNEL_COLORS_MAP: Record<string, string> = {
  facebook_messenger: '#1877f2',
  facebook_comment: '#1877f2',
  zalo: '#0068ff',
  telegram: '#26a5e4',
  chatwork: '#ee2224',
  website: '#10b981',
  email: '#ea4335',
}

const CHANNEL_NAME_KEYS: Record<string, string> = {
  facebook_messenger: 'channels.fb.name',
  facebook_comment: 'channels.fbc.name',
  zalo: 'channels.zalo.name',
  telegram: 'channels.tg.name',
  chatwork: 'channels.cw.name',
  website: 'channels.web.name',
  email: 'channels.email.name',
}

const CHANNEL_DESC_KEYS: Record<string, string> = {
  facebook_messenger: 'channels.fb.desc',
  facebook_comment: 'channels.fbc.desc',
  zalo: 'channels.zalo.desc',
  telegram: 'channels.tg.desc',
  chatwork: 'channels.cw.desc',
  website: 'channels.web.desc',
  email: 'channels.email.desc',
}

function SettingRow({ icon: Icon, label, description, children }: { icon: React.ElementType; label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-foreground/[0.03] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{label}</p>
          {description && <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">{title}</h4>
}

// ═══ PROFILE TAB ═══
interface AgentStats {
  conversationsToday: number
  avgResponse: string
  avgRating: string
  totalConversations: number
}

function ProfileTab() {
  const currentUser = useCRMStore((s) => s.currentUser)
  const setCurrentUser = useCRMStore((s) => s.setCurrentUser)
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', bio: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    cachedFetch('/api/agents/me/stats')
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (currentUser) setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio })
  }, [currentUser])

  const handleSave = async () => {
    if (!currentUser || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const updated = await apiPut('/api/auth/me', { name: form.name, email: form.email, phone: form.phone, bio: form.bio })
      setCurrentUser({ ...currentUser, ...updated })
      setEditing(false)
      setStatusModal({ type: 'success', text: t('profile.saveSuccess') })
    } catch {
      setStatusModal({ type: 'error', text: t('profile.saveFailed') })
    }
    setSaving(false)
    savingRef.current = false
  }
  const handleCancel = () => { if (currentUser) setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio }); setEditing(false) }
  const handleStatusChange = async (status: UserProfile['status']) => {
    if (!currentUser) return
    setCurrentUser({ ...currentUser, status })
    try { await apiPut('/api/auth/me', { status }) } catch { /* optimistic update already applied */ }
  }

  if (!currentUser) return null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Modal */}
      <Dialog open={!!statusModal} onOpenChange={(open) => { if (!open) setStatusModal(null) }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className={cn('text-base flex items-center gap-2', statusModal?.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
              {statusModal?.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {statusModal?.type === 'success' ? t('common.success') : t('common.failed')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/70">
              {statusModal?.text}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setStatusModal(null)} className="rounded-xl h-9 text-xs">{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <Avatar className={cn('h-24 w-24 ring-4 ring-background shadow-xl', GRADIENT_CLASSES[0])}>
              <AvatarFallback className="text-3xl text-white font-bold">{currentUser.name.split(' ').slice(-2).map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <button onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
          </div>
          {!editing && (
            <div className="text-center">
              <h3 className="text-xl font-bold tracking-tight">{currentUser.name}</h3>
              <p className="text-sm text-muted-foreground/60 mt-1 font-medium">{currentUser.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium px-3 py-1.5 rounded-full bg-foreground/[0.04] text-muted-foreground/70">
                <Shield className="h-3.5 w-3.5" />
                {currentUser.role === 'admin' ? t('user.role.admin') : currentUser.role === 'agent' ? t('user.role.agent') : currentUser.role === 'supervisor' ? t('user.role.supervisor') : currentUser.role}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => handleStatusChange(opt.value)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border', currentUser.status === opt.value ? 'border-primary/30 bg-primary/5 text-primary' : 'border-transparent text-muted-foreground/50 hover:text-foreground hover:bg-foreground/[0.03]')}>
                <span className={cn('h-2 w-2 rounded-full', opt.color, currentUser.status === opt.value && 'shadow-sm')} />
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <SectionHeader title={t('profile.personalInfo')} />
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('profile.displayName')}</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} disabled={!editing} className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('profile.email')}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} disabled={!editing} className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('profile.phoneNumber')}</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} disabled={!editing} className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('profile.bio')}</Label>
              <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} disabled={!editing} className="rounded-xl glass-input min-h-[80px] resize-none text-sm" />
            </div>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} className="w-full h-10 rounded-xl text-sm font-medium"><Pencil className="h-4 w-4 mr-1.5" /> {t('profile.editInfo')}</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1 h-10 rounded-xl text-sm font-medium"><X className="h-4 w-4 mr-1.5" /> {t('profile.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600">{saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />} {t('profile.save')}</Button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <SectionHeader title={t('profile.stats.title')} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('profile.stat.conversationsToday'), value: stats ? String(stats.conversationsToday) : '--', icon: MessageSquare },
            { label: t('profile.stat.avgResponse'), value: stats?.avgResponse || '--', icon: Clock },
            { label: t('profile.stat.avgRating'), value: stats?.avgRating || '--', icon: Shield },
            { label: t('profile.stat.totalConversations'), value: stats ? String(stats.totalConversations) : '--', icon: User },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <stat.icon className="h-4 w-4 text-muted-foreground/40 mb-2" />
              <p className="text-lg font-bold tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══ SYSTEM TAB ═══
function SystemTab() {
  const settings = useCRMStore((s) => s.settings)
  const updateSettings = useCRMStore((s) => s.updateSettings)
  const notifCount = useCRMStore((s) => s.notifications.length)
  const clearAllNotifications = useCRMStore((s) => s.clearAllNotifications)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { t } = useT()
  useEffect(() => { setMounted(true) }, [])

  const handleUpdateSetting = async (patch: Record<string, unknown>) => {
    updateSettings(patch)
    try {
      const newSettings = { ...useCRMStore.getState().settings, ...patch }
      await apiPut('/api/auth/me/settings', newSettings)
      setStatusModal({ type: 'success', text: t('settings.saveSuccess') })
    } catch {
      setStatusModal({ type: 'error', text: t('settings.saveFailed') })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Modal */}
      <Dialog open={!!statusModal} onOpenChange={(open) => { if (!open) setStatusModal(null) }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className={cn('text-base flex items-center gap-2', statusModal?.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
              {statusModal?.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {statusModal?.type === 'success' ? t('common.success') : t('common.failed')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/70">{statusModal?.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setStatusModal(null)} className="rounded-xl h-9 text-xs">{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="space-y-1">
        <SectionHeader title={t('settings.appearance')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={mounted && theme === 'dark' ? Moon : Sun} label={t('settings.theme')} description={t('settings.themeDesc')}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5 border-border/40" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {mounted && (theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />)}
              {mounted ? (theme === 'dark' ? t('settings.dark') : t('settings.light')) : ''}
            </Button>
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Maximize2} label={t('settings.compactMode')} description={t('settings.compactModeDesc')}>
            <Switch checked={settings.compactMode} onCheckedChange={(v) => handleUpdateSetting({ compactMode: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Eye} label={t('settings.showPreview')} description={t('settings.showPreviewDesc')}>
            <Switch checked={settings.showPreview} onCheckedChange={(v) => handleUpdateSetting({ showPreview: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Globe} label={t('settings.language')}>
            <Select value={settings.language} onValueChange={(v) => handleUpdateSetting({ language: v as Locale })}>
              <SelectTrigger className="w-32 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALES.map((loc) => <SelectItem key={loc} value={loc}>{LOCALE_LABELS[loc]}</SelectItem>)}</SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>
      <div className="space-y-1">
        <SectionHeader title={t('settings.notifications')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Volume2} label={t('settings.sound')} description={t('settings.soundDesc')}>
            <Switch checked={settings.soundEnabled} onCheckedChange={(v) => handleUpdateSetting({ soundEnabled: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Monitor} label={t('settings.desktopNotif')} description={t('settings.desktopNotifDesc')}>
            <Switch checked={settings.desktopNotifEnabled} onCheckedChange={(v) => handleUpdateSetting({ desktopNotifEnabled: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Mail} label={t('settings.emailNotif')} description={t('settings.emailNotifDesc')}>
            <Switch checked={settings.emailNotifEnabled} onCheckedChange={(v) => handleUpdateSetting({ emailNotifEnabled: v })} />
          </SettingRow>
          {notifCount > 0 && (
            <><Separator className="opacity-30 my-1" />
            <Button variant="ghost" size="sm" className="w-full mt-1 h-9 rounded-xl text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]" onClick={clearAllNotifications}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('settings.clearAllNotifs', { count: notifCount })}
            </Button></>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <SectionHeader title={t('settings.conversations')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={UserCheck} label={t('settings.autoAssign')} description={t('settings.autoAssignDesc')}>
            <Switch checked={settings.autoAssign} onCheckedChange={(v) => handleUpdateSetting({ autoAssign: v })} />
          </SettingRow>
        </div>
      </div>
      <div className="space-y-1">
        <SectionHeader title={t('settings.data')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Trash2} label={t('settings.clearCache')} description={t('settings.clearCacheDesc')}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs border-border/40 hover:border-red-300 hover:text-red-600">{t('settings.clearCache')}</Button>
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs border-border/40 hover:border-red-300 hover:text-red-600" onClick={() => { localStorage.removeItem('omnichat_settings'); updateSettings({ soundEnabled: true, desktopNotifEnabled: true, emailNotifEnabled: false, compactMode: false, showPreview: true, autoAssign: true, language: settings.language }) }}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t('settings.resetDefaults')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══ CHANNELS TAB ═══
function ChannelsTab() {
  const { t } = useT()
  const [channels, setChannels] = useState<ChannelData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string } | null>>({})

  // Load channels from API
  useEffect(() => {
    cachedFetch('/api/channels')
      .then(data => { if (Array.isArray(data)) setChannels(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleChannel = async (key: string) => {
    const ch = channels.find(c => c.key === key)
    if (!ch) return
    setChannels(prev => prev.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c))
    apiPut('/api/channels', { channel: key, enabled: !ch.enabled, config: ch.config }).catch(() => {})
  }

  const startEdit = (ch: ChannelData) => {
    setEditingChannel(ch.key)
    setEditForm({ ...ch.config })
    setTestResults(prev => ({ ...prev, [ch.key]: null }))
  }

  const saveChannel = async (key: string) => {
    setSaving(true)
    try {
      const data = await apiPut('/api/channels', { channel: key, config: editForm })
      setChannels(prev => prev.map(c => c.key === key ? { ...c, configured: data.configured, config: data.config || c.config } : c))
      setEditingChannel(null)
    } catch {}
    setSaving(false)
  }

  const testConnection = async (key: string) => {
    setTestingKey(key)
    setTestResults(prev => ({ ...prev, [key]: null }))
    try {
      const ch = channels.find(c => c.key === key)
      const result = await apiPost('/api/channels/test', { channel: key, config: { ...ch?.config, ...editForm } })
      setTestResults(prev => ({ ...prev, [key]: result }))
      // Update channel data to reflect new test result
      setChannels(prev => prev.map(c => c.key === key ? {
        ...c,
        lastTestAt: new Date().toISOString(),
        lastTestOk: result.ok,
        lastTestMsg: result.msg,
      } : c))
    } catch {
      setTestResults(prev => ({ ...prev, [key]: { ok: false, msg: t('common.error.serverConnection') } }))
    }
    setTestingKey(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold">{t('channels.configTitle')}</h3>
        <p className="text-xs text-muted-foreground/60 mt-1">{t('channels.configDesc')}</p>
      </div>
      {channels.map((ch) => {
        const Icon = CHANNEL_ICONS[ch.key] || MessageSquare
        const color = CHANNEL_COLORS_MAP[ch.key] || '#6b7280'
        const nameKey = CHANNEL_NAME_KEYS[ch.key] || ch.key
        const descKey = CHANNEL_DESC_KEYS[ch.key] || ch.key
        const isEditing = editingChannel === ch.key
        const testResult = testResults[ch.key]
        const isTesting = testingKey === ch.key

        return (
          <div key={ch.key} className="glass-card rounded-2xl overflow-hidden transition-all duration-200">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: color + '12' }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[13px] font-semibold">{t(nameKey)}</h4>
                      {ch.configured && ch.enabled && (
                        <Badge className="text-[9px] px-1.5 py-0 h-[16px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md font-medium">
                          <Check className="h-2.5 w-2.5 mr-0.5" /> {t('channels.connected')}
                        </Badge>
                      )}
                      {!ch.configured && ch.enabled && (
                        <Badge className="text-[9px] px-1.5 py-0 h-[16px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md font-medium">
                          {t('channels.notConfigured')}
                        </Badge>
                      )}
                      {ch.lastTestAt && (
                        <span className={cn(
                          'text-[9px] font-medium',
                          ch.lastTestOk ? 'text-emerald-600' : 'text-red-500'
                        )}>
                          {ch.lastTestOk ? t('channels.lastTestOk') : t('channels.lastTestFail')}
                          {' · '}{new Date(ch.lastTestAt).toLocaleTimeString('vi-VN')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed">{t(descKey)}</p>
                  </div>
                </div>
                <Switch checked={ch.enabled} onCheckedChange={() => toggleChannel(ch.key)} />
              </div>
            </div>

            {/* Test result banner */}
            {testResult != null && (
              <div className={cn(
                'mx-5 mb-0 px-3.5 py-2.5 rounded-xl text-[11px] font-medium animate-slide-down',
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
              )}>
                {testResult.ok ? <Check className="h-3.5 w-3.5 mr-1.5 inline" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5 inline" />}
                {testResult.msg}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div className="px-5 pb-5 border-t border-border/30 pt-4 space-y-3 animate-slide-down">
                {ch.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground/70">{field.label}</Label>
                    <Input
                      value={editForm[field.key] || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      type={field.type === 'password' ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      className="rounded-xl glass-input h-9 text-sm"
                    />
                  </div>
                ))}

                {/* Website embed snippet */}
                {ch.key === 'website' && editForm.widgetId && (
                  <>
                    <p className="text-[10px] text-muted-foreground/40 mt-1">{t('channels.web.snippetHint')}</p>
                    <div className="bg-foreground/[0.03] rounded-xl p-3 font-mono text-[11px] text-muted-foreground/70 break-all select-all">
                      {`<script src="https://omnichat.vn/widget.js" data-id="${editForm.widgetId}"><` + `/script>`}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditingChannel(null)} className="h-8 rounded-lg text-xs">
                    <X className="h-3.5 w-3.5 mr-1" /> {t('profile.cancel')}
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => testConnection(ch.key)}
                    disabled={isTesting}
                    className="h-8 rounded-lg text-xs"
                  >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                    {isTesting ? t('channels.testing') : t('channels.testConnection')}
                  </Button>
                  <Button size="sm" onClick={() => saveChannel(ch.key)} disabled={saving} className="h-8 rounded-lg text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600">
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    {t('channels.saveConfig')}
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons when not editing */}
            {!isEditing && (
              <div className="px-5 pb-4 flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]" onClick={() => startEdit(ch)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />{ch.configured ? t('channels.editConfig') : t('channels.configure')}
                </Button>
                {ch.configured && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
                    onClick={() => testConnection(ch.key)}
                    disabled={isTesting}
                  >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                    {isTesting ? t('channels.testing') : t('channels.testConnection')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══ STAFF TAB ═══
function StaffTab() {
  const agents = useCRMStore((s) => s.agents)
  const setAgents = useCRMStore((s) => s.setAgents)
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'agent', status: 'online' })

  // Generate stable mock stats per agent
  const staffStats = useMemo(() => {
    const stats: Record<string, { conversations: number; avgResponse: number; satisfaction: number; lastActive: string }> = {}
    agents.forEach((agent) => {
      // Simple deterministic hash from agent id
      const hash = agent.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const conversations = 100 + (hash * 7) % 500
      const avgResponse = 60 + (hash * 13) % 120 // 1-3 min in seconds
      const satisfaction = 4.0 + ((hash * 3) % 10) / 10 // 4.0-5.0
      const daysAgo = (hash * 11) % 30
      const hoursAgo = (hash * 7) % 24
      const lastActive = daysAgo === 0
        ? t('common.time.hoursAgo', { h: hoursAgo })
        : t('common.time.daysAgo', { d: daysAgo })
      stats[agent.id] = { conversations, avgResponse, satisfaction, lastActive }
    })
    return stats
  }, [agents])

  useEffect(() => {
    if (agents.length > 0) { setLoading(false); return }
    async function load() {
      try {
        const data = await cachedFetch('/api/agents')
        if (Array.isArray(data)) { setAgents(data) }
      } catch (e) { console.error('Failed', e) }
      finally { setLoading(false) }
    }
    load()
  }, [agents.length, setAgents])

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const newAgent: Agent = { id: `agent_${Date.now()}`, name: inviteEmail.split('@')[0], email: inviteEmail, avatar: null, role: inviteRole, status: 'offline' }
    setAgents([...agents, newAgent])
    setInviteEmail('')
    setShowInvite(false)
  }

  const openEditDialog = (agent: Agent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditForm({ name: agent.name, email: agent.email, role: agent.role, status: agent.status })
    setDeleteConfirm(false)
    setEditingAgent(agent)
  }

  const handleSaveEdit = () => {
    if (!editingAgent) return
    const updated = { ...editingAgent, ...editForm }
    const newList = agents.map(a => a.id === editingAgent.id ? updated : a)
    setAgents(newList)
    setEditingAgent(null)
  }

  const handleDelete = () => {
    if (!editingAgent) return
    const newList = agents.filter(a => a.id !== editingAgent.id)
    setAgents(newList)
    setEditingAgent(null)
    setDeleteConfirm(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const roleLabel = (role: string) => role === 'admin' ? t('user.role.admin') : role === 'supervisor' ? t('user.role.supervisor') : role === 'agent' ? t('user.role.agent') : role
  const roleBadge = (role: string) => role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : role === 'supervisor' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'

  const formatResponseTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return min > 0 ? `~${min}m ${sec > 0 ? `${sec}s` : ''}` : `~${sec}s`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{t('staff.title')}</h3>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('staff.count', { count: agents.length })}</p>
        </div>
        <Button size="sm" className="h-8 rounded-xl text-xs gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600" onClick={() => setShowInvite(!showInvite)}>
          <Plus className="h-3.5 w-3.5" /> {t('staff.invite')}
        </Button>
      </div>
      {showInvite && (
        <div className="glass-card rounded-2xl p-5 animate-slide-down">
          <h4 className="text-[13px] font-semibold mb-3">{t('staff.inviteTitle')}</h4>
          <div className="flex gap-2">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t('staff.emailPlaceholder')} className="flex-1 rounded-xl glass-input h-9 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleInvite()} />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-28 h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="agent">{t('user.role.agent')}</SelectItem><SelectItem value="supervisor">{t('user.role.supervisor')}</SelectItem><SelectItem value="admin">{t('user.role.admin')}</SelectItem></SelectContent>
            </Select>
            <Button size="sm" onClick={handleInvite} className="h-9 rounded-xl text-xs"><Send className="h-3.5 w-3.5 mr-1" /> {t('staff.send')}</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3"><div className="skeleton-line h-10 w-10 rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton-line h-3.5 w-1/3" /><div className="skeleton-line h-3 w-1/4" /></div></div>))}</div>
        ) : (
          agents.map((agent, idx) => {
            const stats = staffStats[agent.id]
            const isExpanded = expandedId === agent.id
            return (
              <div key={agent.id} className="glass-card rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm">
                {/* Main row - clickable to expand */}
                <div
                  className="p-4 flex items-center gap-3.5 cursor-pointer"
                  onClick={() => toggleExpand(agent.id)}
                >
                  <Avatar className={cn('h-10 w-10 flex-shrink-0', GRADIENT_CLASSES[idx % GRADIENT_CLASSES.length])}>
                    <AvatarFallback className="text-xs text-white font-semibold">{agent.name.split(' ').slice(-2).map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate">{agent.name}</span>
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', agent.status === 'online' ? 'bg-emerald-500' : agent.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400')} />
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{agent.email}</p>
                  </div>
                  <Badge className={cn('text-[10px] px-2 py-0.5 h-[20px] rounded-md font-medium', roleBadge(agent.role))}>{roleLabel(agent.role)}</Badge>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground/30 flex-shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5"
                    onClick={(e) => openEditDialog(agent, e)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                {/* Expanded stats section */}
                {isExpanded && stats && (
                  <div className="px-4 pb-4 pt-0 animate-slide-down">
                    <div className="border-t border-border/20 pt-3 mt-1">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{stats.conversations}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.totalConversations')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{formatResponseTime(stats.avgResponse)}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.avgResponse')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Star className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{stats.satisfaction.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.satisfaction')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold">{stats.lastActive}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.lastActive')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => { if (!open) { setEditingAgent(null); setDeleteConfirm(false) } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('staff.edit')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              {editingAgent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.name')}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.emailLabel')}</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.role')}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('user.role.admin')}</SelectItem>
                    <SelectItem value="supervisor">{t('user.role.supervisor')}</SelectItem>
                    <SelectItem value="agent">{t('user.role.agent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.status')}</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">{t('profile.status.online')}</SelectItem>
                    <SelectItem value="busy">{t('profile.status.busy')}</SelectItem>
                    <SelectItem value="away">{t('profile.status.away')}</SelectItem>
                    <SelectItem value="offline">{t('profile.status.offline')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {!deleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 rounded-lg text-xs"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('staff.delete')}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-500 font-medium">{t('staff.deleteConfirm')}</span>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setDeleteConfirm(false)}>
                  <X className="h-3 w-3 mr-1" /> {t('staff.cancelEdit')}
                </Button>
                <Button variant="destructive" size="sm" className="h-8 rounded-lg text-xs" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> {t('staff.delete')}
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => { setEditingAgent(null); setDeleteConfirm(false) }}>
                {t('staff.cancelEdit')}
              </Button>
              <Button size="sm" className="h-8 rounded-lg text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600" onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" /> {t('staff.save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══ SECURITY TAB ═══
interface BlacklistItem {
  type: 'ip' | 'email'
  value: string
  reason: string
  addedAt: string
  addedBy: string
}

function SecurityTab() {
  const { t } = useT()
  const [config, setConfig] = useState({ rateLimitPerMinute: 60, rateLimitEnabled: true, blacklistEnabled: true })
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newType, setNewType] = useState<'ip' | 'email'>('ip')
  const [newValue, setNewValue] = useState('')
  const [newReason, setNewReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rateLimitInput, setRateLimitInput] = useState('60')
  const [confirmRemove, setConfirmRemove] = useState<{ type: string; value: string } | null>(null)
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [configData, blacklistData] = await Promise.all([
        cachedFetch('/api/security/config'),
        cachedFetch('/api/security/blacklist'),
      ])
      setConfig(configData)
      setRateLimitInput(String(configData.rateLimitPerMinute))
      setBlacklist(blacklistData.data || [])
    } catch (e) { console.error('Failed to load security config', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const data: any = await apiPut('/api/security/config', {
        ...config,
        rateLimitPerMinute: parseInt(rateLimitInput) || 60,
      })
      if (data?.data) setConfig(data.data)
      setStatusModal({ type: 'success', text: t('security.saveSuccess') })
    } catch {
      setStatusModal({ type: 'error', text: t('security.saveFailed') })
    }
    finally { setSaving(false) }
  }

  const addToBlacklist = async () => {
    if (!newValue.trim()) return
    setAdding(true)
    try {
      const data: any = await apiPost('/api/security/blacklist', {
        type: newType, value: newValue.trim(), reason: newReason.trim(),
      })
      setBlacklist(prev => [data.data, ...prev])
      setNewValue('')
      setNewReason('')
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  const confirmRemoveFromBlacklist = async () => {
    if (!confirmRemove) return
    setRemoving(true)
    try {
      await apiFetch(`/api/security/blacklist?type=${confirmRemove.type}&value=${encodeURIComponent(confirmRemove.value)}`, { method: 'DELETE' })
      setBlacklist(prev => prev.filter(e => !(e.type === confirmRemove.type && e.value === confirmRemove.value)))
      setStatusModal({ type: 'success', text: t('security.blacklist.removeSuccess') })
    } catch {
      setStatusModal({ type: 'error', text: t('security.blacklist.removeFailed') })
    }
    setRemoving(false)
    setConfirmRemove(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Rate Limiting */}
      <div className="space-y-1">
        <SectionHeader title={t('security.rateLimit.title')} />
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <SettingRow icon={Zap} label={t('security.rateLimit.enabled')} description={t('security.rateLimit.enabledDesc')}>
            <Switch
              checked={config.rateLimitEnabled}
              onCheckedChange={(v) => setConfig(c => ({ ...c, rateLimitEnabled: v }))}
            />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Clock} label={t('security.rateLimit.maxRequests')} description={t('security.rateLimit.maxRequestsDesc')}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={10000}
                value={rateLimitInput}
                onChange={(e) => setRateLimitInput(e.target.value)}
                className="w-24 h-8 rounded-lg text-sm text-center"
                disabled={!config.rateLimitEnabled}
              />
              <span className="text-xs text-muted-foreground/50">/ {t('security.rateLimit.perMinute')}</span>
            </div>
          </SettingRow>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="w-full h-9 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            {t('security.saveConfig')}
          </Button>
        </div>
      </div>

      {/* Blacklist */}
      <div className="space-y-1">
        <SectionHeader title={t('security.blacklist.title')} />
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <SettingRow icon={Ban} label={t('security.blacklist.enabled')} description={t('security.blacklist.enabledDesc')}>
            <Switch
              checked={config.blacklistEnabled}
              onCheckedChange={(v) => setConfig(c => ({ ...c, blacklistEnabled: v }))}
            />
          </SettingRow>
          <Separator className="opacity-30 my-1" />

          {/* Add form */}
          <div className="space-y-3 p-3 rounded-xl bg-foreground/[0.02]">
            <p className="text-xs font-medium text-muted-foreground/70">{t('security.blacklist.addNew')}</p>
            <div className="flex gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as 'ip' | 'email')}>
                <SelectTrigger className="w-24 h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip">{t('common.type.ip')}</SelectItem>
                  <SelectItem value="email">{t('common.type.email')}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={newType === 'ip' ? '192.168.1.1' : 'spam@example.com'}
                className="flex-1 h-9 rounded-lg text-sm"
              />
            </div>
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder={t('security.blacklist.reasonPlaceholder')}
              className="h-9 rounded-lg text-sm"
            />
            <Button
              onClick={addToBlacklist}
              disabled={adding || !newValue.trim()}
              size="sm"
              className="h-9 rounded-lg text-xs bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1.5" />}
              {t('security.blacklist.addBtn')}
            </Button>
          </div>

          {/* Blacklist table */}
          {blacklist.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground/50">
                {t('security.blacklist.count', { count: blacklist.length })}
              </p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {blacklist.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-md font-mono">
                          {entry.type === 'ip' ? t('common.type.ip') : t('common.type.email')}
                        </Badge>
                        <span className="text-xs font-mono font-medium truncate">{entry.value}</span>
                      </div>
                      {entry.reason && (
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">{entry.reason}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground/30 mt-0.5">
                        {new Date(entry.addedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all"
                      onClick={() => setConfirmRemove({ type: entry.type, value: entry.value })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blacklist.length === 0 && (
            <div className="text-center py-6">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">{t('security.blacklist.empty')}</p>
            </div>
          )}

          <Button
            onClick={saveConfig}
            disabled={saving}
            className="w-full h-9 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            {t('security.saveConfig')}
          </Button>
        </div>
      </div>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => { if (!open) setConfirmRemove(null) }}>
        <AlertDialogContent className="sm:max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{t('security.blacklist.removeConfirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/70">
              {confirmRemove?.value}{confirmRemove?.reason ? ` — ${confirmRemove.reason}` : ''}
              <br />{t('security.blacklist.removeConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-9 text-xs" disabled={removing}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveFromBlacklist} disabled={removing} className="rounded-xl h-9 text-xs bg-destructive hover:bg-destructive/90">
              {removing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              {t('security.blacklist.removeConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Modal */}
      <Dialog open={!!statusModal} onOpenChange={(open) => { if (!open) setStatusModal(null) }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className={cn('text-base flex items-center gap-2', statusModal?.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
              {statusModal?.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {statusModal?.type === 'success' ? t('common.success') : t('common.failed')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/70">{statusModal?.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setStatusModal(null)} className="rounded-xl h-9 text-xs">{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══ BACKUP TAB ═══
interface BackupItem {
  id: string
  filename: string
  size: number
  createdAt: string
}

function BackupTab() {
  const { t } = useT()
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'restore'; id: string } | null>(null)

  const loadBackups = async (forceFresh = false) => {
    setLoading(true)
    try {
      const data = await cachedFetch('/api/backup', { forceFresh })
      setBackups(data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadBackups() }, [])

  const createBackup = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const data: any = await apiPost('/api/backup', {})
      setMessage({ type: 'success', text: t('backup.created') })
      loadBackups(true)
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.data?.error || t('backup.createFailed') })
    }
    finally { setCreating(false) }
  }

  const restoreBackup = async (id: string) => {
    setRestoring(id)
    setMessage(null)
    try {
      await apiPost('/api/backup/restore', { backupId: id })
      setMessage({ type: 'success', text: t('backup.restored') })
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.data?.error || t('backup.restoreFailed') })
    }
    finally { setRestoring(null) }
  }

  const deleteBackup = async (id: string) => {
    setDeleting(id)
    try {
      await apiFetch(`/api/backup?id=${id}`, { method: 'DELETE' })
      setBackups(prev => prev.filter(b => b.id !== id))
      setMessage({ type: 'success', text: t('backup.deleteSuccess') })
    } catch {
      setMessage({ type: 'error', text: t('backup.deleteFailed') })
    }
    finally { setDeleting(null) }
  }

  const executeConfirmedAction = async () => {
    if (!confirmAction) return
    if (confirmAction.type === 'restore') {
      setConfirmAction(null)
      await restoreBackup(confirmAction.id)
    } else {
      setConfirmAction(null)
      await deleteBackup(confirmAction.id)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <SectionHeader title={t('backup.manage')} />
        <div className="glass-card rounded-2xl p-5 space-y-4">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-foreground/[0.02]">
            <HardDrive className="h-5 w-5 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">{t('backup.info')}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1 leading-relaxed">{t('backup.infoDesc')}</p>
            </div>
          </div>

          {/* Create backup button */}
          <Button
            onClick={createBackup}
            disabled={creating}
            className="w-full h-10 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/15"
          >
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {t('backup.createBtn')}
          </Button>

          {/* Message */}
          {message && (
            <div className={cn(
              'p-3 rounded-xl text-xs font-medium flex items-center gap-2',
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
            )}>
              {message.type === 'success' ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {message.text}
            </div>
          )}

          {/* Backup list */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground/50">
              {t('backup.list', { count: backups.length })}
            </p>
            {backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/40">{t('backup.empty')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground/30" />
                        <span className="text-xs font-medium truncate">{backup.id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/40">{formatSize(backup.size)}</span>
                        <span className="text-[10px] text-muted-foreground/30">
                          {new Date(backup.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 rounded-lg text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => setConfirmAction({ type: 'restore', id: backup.id })}
                        disabled={restoring === backup.id}
                      >
                        {restoring === backup.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        {t('backup.restore')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-red-500"
                        onClick={() => setConfirmAction({ type: 'delete', id: backup.id })}
                        disabled={deleting === backup.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent className="sm:max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              {confirmAction?.type === 'delete' ? t('backup.deleteConfirm') : t('backup.restoreConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/70">
              {confirmAction?.type === 'delete' ? t('backup.deleteConfirmDesc') : t('backup.restoreConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-9 text-xs">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmedAction}
              disabled={restoring !== null || deleting !== null}
              className={cn('rounded-xl h-9 text-xs', confirmAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : '')}
            >
              {(restoring !== null || deleting !== null) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {confirmAction?.type === 'delete' ? <Trash2 className="h-3.5 w-3.5 mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              {confirmAction?.type === 'delete' ? t('backup.deleteConfirm') : t('backup.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═══ MAIN PAGE ═══
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
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'system', 'channels', 'staff', 'security', 'backup'].includes(tabParam)) {
      return tabParam as SettingsTab
    }
    return 'profile'
  })
  const setCurrentUser = useCRMStore((s) => s.setCurrentUser)
  const setAuthenticated = useCRMStore((s) => s.setAuthenticated)

  // Load current user from API on mount (skip if already loaded in main page)
  useEffect(() => {
    if (useCRMStore.getState().currentUser) {
      setAuthenticated(true)
      return
    }
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(user => {
        setAuthenticated(true)
        setCurrentUser({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          avatar: user.avatar,
          status: user.status || 'online',
          bio: user.bio || '',
        })
        // Initialize settings from DB (user.settings JSON field)
        if (user.settings) {
          const { initSettingsFromDB } = useCRMStore.getState()
          initSettingsFromDB(typeof user.settings === 'string' ? user.settings : JSON.stringify(user.settings))
        }
      })
      .catch(() => {
        window.location.href = '/login'
      })
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />
      case 'system': return <SystemTab />
      case 'channels': return <ChannelsTab />
      case 'staff': return <StaffTab />
      case 'security': return <SecurityTab />
      case 'backup': return <BackupTab />
      default: return null
    }
  }

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
          <div className="max-w-2xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}
