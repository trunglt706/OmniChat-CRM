'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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

const STATUS_OPTIONS: { value: UserProfile['status']; labelKey: string; color: string }[] = [
  { value: 'online', labelKey: 'profile.status.online', color: 'bg-emerald-500' },
  { value: 'busy', labelKey: 'profile.status.busy', color: 'bg-amber-500' },
  { value: 'away', labelKey: 'profile.status.away', color: 'bg-orange-400' },
  { value: 'offline', labelKey: 'profile.status.offline', color: 'bg-gray-400' },
]

interface ChannelDefinition {
  key: string
  nameKey: string
  descKey: string
  color: string
  icon: React.ElementType
  enabled: boolean
  configured: boolean
  config?: Record<string, string>
}

const CHANNEL_DEFINITIONS: Omit<ChannelDefinition, 'enabled' | 'configured' | 'config'>[] = [
  { key: 'facebook_messenger', nameKey: 'channels.fb.name', descKey: 'channels.fb.desc', color: '#1877f2', icon: MessageSquare },
  { key: 'zalo', nameKey: 'channels.zalo.name', descKey: 'channels.zalo.desc', color: '#0068ff', icon: Phone },
  { key: 'telegram', nameKey: 'channels.tg.name', descKey: 'channels.tg.desc', color: '#26a5e4', icon: Send },
  { key: 'website', nameKey: 'channels.web.name', descKey: 'channels.web.desc', color: '#10b981', icon: Globe2 },
  { key: 'email', nameKey: 'channels.email.name', descKey: 'channels.email.desc', color: '#ea4335', icon: Mail },
]

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
function ProfileTab() {
  const { currentUser, setCurrentUser } = useCRMStore()
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', bio: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentUser) setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio })
  }, [currentUser])

  const handleSave = () => { if (currentUser) { setCurrentUser({ ...currentUser, ...form }); setEditing(false) } }
  const handleCancel = () => { if (currentUser) setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio }); setEditing(false) }
  const handleStatusChange = (status: UserProfile['status']) => { if (currentUser) setCurrentUser({ ...currentUser, status }) }

  if (!currentUser) return null

  return (
    <div className="space-y-6 animate-fade-in">
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
              <Button onClick={handleSave} className="flex-1 h-10 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"><Check className="h-4 w-4 mr-1.5" /> {t('profile.save')}</Button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <SectionHeader title={t('profile.stats.title')} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('profile.stat.conversationsToday'), value: '12', icon: MessageSquare },
            { label: t('profile.stat.avgResponse'), value: '2m 30s', icon: Clock },
            { label: t('profile.stat.avgRating'), value: '4.8/5', icon: Shield },
            { label: t('profile.stat.totalConversations'), value: '1,247', icon: User },
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
  const { settings, updateSettings, notifications, clearAllNotifications } = useCRMStore()
  const { theme, setTheme } = useTheme()
  const { t } = useT()
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <SectionHeader title={t('settings.appearance')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={theme === 'dark' ? Moon : Sun} label={t('settings.theme')} description={t('settings.themeDesc')}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5 border-border/40" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {theme === 'dark' ? t('settings.dark') : t('settings.light')}
            </Button>
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Maximize2} label={t('settings.compactMode')} description={t('settings.compactModeDesc')}>
            <Switch checked={settings.compactMode} onCheckedChange={(v) => updateSettings({ compactMode: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Eye} label={t('settings.showPreview')} description={t('settings.showPreviewDesc')}>
            <Switch checked={settings.showPreview} onCheckedChange={(v) => updateSettings({ showPreview: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Globe} label={t('settings.language')}>
            <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as Locale })}>
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
            <Switch checked={settings.soundEnabled} onCheckedChange={(v) => updateSettings({ soundEnabled: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Monitor} label={t('settings.desktopNotif')} description={t('settings.desktopNotifDesc')}>
            <Switch checked={settings.desktopNotifEnabled} onCheckedChange={(v) => updateSettings({ desktopNotifEnabled: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Mail} label={t('settings.emailNotif')} description={t('settings.emailNotifDesc')}>
            <Switch checked={settings.emailNotifEnabled} onCheckedChange={(v) => updateSettings({ emailNotifEnabled: v })} />
          </SettingRow>
          {notifications.length > 0 && (
            <><Separator className="opacity-30 my-1" />
            <Button variant="ghost" size="sm" className="w-full mt-1 h-9 rounded-xl text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]" onClick={() => clearAllNotifications()}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('settings.clearAllNotifs', { count: notifications.length })}
            </Button></>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <SectionHeader title={t('settings.conversations')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={UserCheck} label={t('settings.autoAssign')} description={t('settings.autoAssignDesc')}>
            <Switch checked={settings.autoAssign} onCheckedChange={(v) => updateSettings({ autoAssign: v })} />
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
interface ChannelSetting {
  key: string
  name: string
  description: string
  color: string
  icon: React.ElementType
  enabled: boolean
  configured: boolean
  config?: Record<string, string>
}

function ChannelsTab() {
  const { t } = useT()
  const [channels, setChannels] = useState<ChannelSetting[]>([
    { key: 'facebook_messenger', name: t('channels.fb.name'), description: t('channels.fb.desc'), color: '#1877f2', icon: MessageSquare, enabled: true, configured: true, config: { pageId: 'OmniChat Official', token: 'hidden' } },
    { key: 'zalo', name: t('channels.zalo.name'), description: t('channels.zalo.desc'), color: '#0068ff', icon: Phone, enabled: true, configured: true, config: { phone: '0901 234 567' } },
    { key: 'telegram', name: t('channels.tg.name'), description: t('channels.tg.desc'), color: '#26a5e4', icon: Send, enabled: false, configured: false, config: {} },
    { key: 'website', name: t('channels.web.name'), description: t('channels.web.desc'), color: '#10b981', icon: Globe2, enabled: true, configured: true, config: { webhook: 'https://omnichat.vn/widget/abc123' } },
    { key: 'email', name: t('channels.email.name'), description: t('channels.email.desc'), color: '#ea4335', icon: Mail, enabled: false, configured: false, config: {} },
  ])

  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const toggleChannel = (key: string) => setChannels(prev => prev.map(ch => ch.key === key ? { ...ch, enabled: !ch.enabled } : ch))
  const startEdit = (ch: ChannelSetting) => { setEditingChannel(ch.key); setEditForm(ch.config || {}) }
  const saveChannel = (key: string) => {
    setChannels(prev => prev.map(ch => ch.key === key ? { ...ch, configured: Object.values(editForm).some(v => v.length > 0), config: { ...editForm } } : ch))
    setEditingChannel(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold">{t('channels.configTitle')}</h3>
        <p className="text-xs text-muted-foreground/60 mt-1">{t('channels.configDesc')}</p>
      </div>
      {channels.map((ch) => {
        const Icon = ch.icon
        const isEditing = editingChannel === ch.key
        return (
          <div key={ch.key} className="glass-card rounded-2xl overflow-hidden transition-all duration-200">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: ch.color + '12' }}>
                    <Icon className="h-5 w-5" style={{ color: ch.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-semibold">{ch.name}</h4>
                      {ch.configured && ch.enabled && <Badge className="text-[9px] px-1.5 py-0 h-[16px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md font-medium"><Check className="h-2.5 w-2.5 mr-0.5" /> {t('channels.connected')}</Badge>}
                      {!ch.configured && ch.enabled && <Badge className="text-[9px] px-1.5 py-0 h-[16px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md font-medium">{t('channels.notConfigured')}</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed">{ch.description}</p>
                  </div>
                </div>
                <Switch checked={ch.enabled} onCheckedChange={() => toggleChannel(ch.key)} />
              </div>
            </div>
            {isEditing && (
              <div className="px-5 pb-5 border-t border-border/30 pt-4 space-y-3 animate-slide-down">
                {ch.key === 'facebook_messenger' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.fb.pageName')}</Label>
                      <Input value={editForm.pageId || ''} onChange={(e) => setEditForm(f => ({ ...f, pageId: e.target.value }))} placeholder={t('channels.fb.pageNamePlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.fb.token')}</Label>
                      <Input value={editForm.token || ''} onChange={(e) => setEditForm(f => ({ ...f, token: e.target.value }))} type="password" placeholder={t('channels.fb.tokenPlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                  </>
                )}
                {ch.key === 'zalo' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.zalo.phone')}</Label>
                    <Input value={editForm.phone || ''} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('channels.zalo.phonePlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                  </div>
                )}
                {ch.key === 'telegram' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.tg.token')}</Label>
                    <Input value={editForm.token || ''} onChange={(e) => setEditForm(f => ({ ...f, token: e.target.value }))} type="password" placeholder={t('channels.tg.tokenPlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                  </div>
                )}
                {ch.key === 'website' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.web.webhook')}</Label>
                      <Input value={editForm.webhook || ''} onChange={(e) => setEditForm(f => ({ ...f, webhook: e.target.value }))} placeholder={t('channels.web.webhookPlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 mt-1">{t('channels.web.snippetHint')}</p>
                    <div className="bg-foreground/[0.03] rounded-xl p-3 font-mono text-[11px] text-muted-foreground/70 break-all select-all">
                      {`<script src="https://omnichat.vn/widget.js" data-id="abc123"><` + `/script>`}
                    </div>
                  </>
                )}
                {ch.key === 'email' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.email.address')}</Label>
                      <Input value={editForm.email || ''} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder={t('channels.email.placeholder')} className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.email.imap')}</Label>
                      <Input placeholder={t('channels.email.imapPlaceholder')} className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditingChannel(null)} className="h-8 rounded-lg text-xs"><X className="h-3.5 w-3.5 mr-1" /> {t('profile.cancel')}</Button>
                  <Button size="sm" onClick={() => saveChannel(ch.key)} className="h-8 rounded-lg text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"><Check className="h-3.5 w-3.5 mr-1" /> {t('channels.saveConfig')}</Button>
                </div>
              </div>
            )}
            {!isEditing && (
              <div className="px-5 pb-4">
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]" onClick={() => startEdit(ch)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />{ch.configured ? t('channels.editConfig') : t('channels.configure')}
                </Button>
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
  const { agents, setAgents } = useCRMStore()
  const { t } = useT()
  const [staffList, setStaffList] = useState<Agent[]>([])
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
    staffList.forEach((agent) => {
      // Simple deterministic hash from agent id
      const hash = agent.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const conversations = 100 + (hash * 7) % 500
      const avgResponse = 60 + (hash * 13) % 120 // 1-3 min in seconds
      const satisfaction = 4.0 + ((hash * 3) % 10) / 10 // 4.0-5.0
      const daysAgo = (hash * 11) % 30
      const hoursAgo = (hash * 7) % 24
      const lastActive = daysAgo === 0
        ? `${hoursAgo}h ago`
        : `${daysAgo}d ago`
      stats[agent.id] = { conversations, avgResponse, satisfaction, lastActive }
    })
    return stats
  }, [staffList])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agents')
        const data = await res.json()
        if (Array.isArray(data)) { setStaffList(data); setAgents(data) }
      } catch (e) { console.error('Failed', e) }
      finally { setLoading(false) }
    }
    load()
  }, [setAgents])

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const newAgent: Agent = { id: `agent_${Date.now()}`, name: inviteEmail.split('@')[0], email: inviteEmail, avatar: null, role: inviteRole, status: 'offline' }
    setStaffList(prev => [...prev, newAgent])
    setAgents([...staffList, newAgent])
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
    const newList = staffList.map(a => a.id === editingAgent.id ? updated : a)
    setStaffList(newList)
    setAgents(newList)
    setEditingAgent(null)
  }

  const handleDelete = () => {
    if (!editingAgent) return
    const newList = staffList.filter(a => a.id !== editingAgent.id)
    setStaffList(newList)
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
          <p className="text-xs text-muted-foreground/60 mt-1">{t('staff.count', { count: staffList.length })}</p>
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
          staffList.map((agent, idx) => {
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

  const loadData = async () => {
    setLoading(true)
    try {
      const [configRes, blacklistRes] = await Promise.all([
        fetch('/api/security/config'),
        fetch('/api/security/blacklist'),
      ])
      const configData = await configRes.json()
      const blacklistData = await blacklistRes.json()
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
      const res = await fetch('/api/security/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          rateLimitPerMinute: parseInt(rateLimitInput) || 60,
        }),
      })
      const data = await res.json()
      if (data.data) setConfig(data.data)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const addToBlacklist = async () => {
    if (!newValue.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/security/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, value: newValue.trim(), reason: newReason.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setBlacklist(prev => [data.data, ...prev])
        setNewValue('')
        setNewReason('')
      }
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  const removeFromBlacklist = async (type: string, value: string) => {
    try {
      await fetch(`/api/security/blacklist?type=${type}&value=${encodeURIComponent(value)}`, { method: 'DELETE' })
      setBlacklist(prev => prev.filter(e => !(e.type === type && e.value === value)))
    } catch (e) { console.error(e) }
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
                  <SelectItem value="ip">IP</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
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
                          {entry.type === 'ip' ? 'IP' : 'EMAIL'}
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
                      onClick={() => removeFromBlacklist(entry.type, entry.value)}
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

  const loadBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/backup')
      const data = await res.json()
      setBackups(data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadBackups() }, [])

  const createBackup = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: t('backup.created') })
        loadBackups()
      } else {
        setMessage({ type: 'error', text: data.error || t('backup.createFailed') })
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('backup.createFailed') })
    }
    finally { setCreating(false) }
  }

  const restoreBackup = async (id: string) => {
    setRestoring(id)
    setMessage(null)
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: id }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: t('backup.restored') })
      } else {
        setMessage({ type: 'error', text: data.error || t('backup.restoreFailed') })
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('backup.restoreFailed') })
    }
    finally { setRestoring(null) }
  }

  const deleteBackup = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/backup?id=${id}`, { method: 'DELETE' })
      setBackups(prev => prev.filter(b => b.id !== id))
    } catch (e) { console.error(e) }
    finally { setDeleting(null) }
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
                        onClick={() => restoreBackup(backup.id)}
                        disabled={restoring === backup.id}
                      >
                        {restoring === backup.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        {t('backup.restore')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-red-500"
                        onClick={() => deleteBackup(backup.id)}
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
    </div>
  )
}

// ═══ MAIN PAGE ═══
export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Restore tab from URL ?tab=xxx
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'system', 'channels', 'staff', 'security', 'backup'].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const saved = localStorage.getItem('omnichat_settings')
      if (saved) useCRMStore.getState().updateSettings(JSON.parse(saved))
    } catch {}
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
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex h-full">
          <nav className="w-56 md:w-64 border-r border-border/20 flex-shrink-0 flex-col p-3 space-y-1 overflow-y-auto">
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
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">{renderContent()}</div>
          </main>
        </div>
        <div className="md:hidden flex flex-col h-full">
          <div className="flex-shrink-0 border-b border-border/20 flex overflow-x-auto scrollbar-none">
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
          <main className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
