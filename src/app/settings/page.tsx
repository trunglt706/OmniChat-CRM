'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { cn } from '@/lib/utils'
import { CHANNEL_CONFIG, type Agent } from '@/lib/types'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/translations'
import {
  ArrowLeft, User, Settings, MessageSquare, Users, Moon, Sun,
  Volume2, Monitor, Mail, Maximize2, Eye, Globe, UserCheck,
  Camera, Check, X, Shield, Clock, MessageSquareOff, Phone,
  Send, Trash2, RotateCcw, Pencil, MoreVertical, Plus, Bell,
  Globe2,
} from 'lucide-react'

const SETTINGS_TABS = [
  { key: 'profile', labelKey: 'settingsTab.profile', icon: User },
  { key: 'system', labelKey: 'settingsTab.system', icon: Settings },
  { key: 'channels', labelKey: 'settingsTab.channels', icon: MessageSquare },
  { key: 'staff', labelKey: 'settingsTab.staff', icon: Users },
] as const

type SettingsTab = typeof SETTINGS_TABS[number]['key']

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
              <Label className="text-xs font-medium text-muted-foreground/70">Email</Label>
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
                      <Input value={editForm.token || ''} onChange={(e) => setEditForm(f => ({ ...f, token: e.target.value }))} type="password" placeholder="EAAxxxxxxx..." className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                  </>
                )}
                {ch.key === 'zalo' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.zalo.phone')}</Label>
                    <Input value={editForm.phone || ''} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="rounded-xl glass-input h-9 text-sm" />
                  </div>
                )}
                {ch.key === 'telegram' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.tg.token')}</Label>
                    <Input value={editForm.token || ''} onChange={(e) => setEditForm(f => ({ ...f, token: e.target.value }))} type="password" placeholder="123456:ABC-DEF..." className="rounded-xl glass-input h-9 text-sm" />
                  </div>
                )}
                {ch.key === 'website' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.web.webhook')}</Label>
                      <Input value={editForm.webhook || ''} onChange={(e) => setEditForm(f => ({ ...f, webhook: e.target.value }))} placeholder="https://your-domain.com/api/webhook" className="rounded-xl glass-input h-9 text-sm" />
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
                      <Input value={editForm.email || ''} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="support@company.com" className="rounded-xl glass-input h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground/70">{t('channels.email.imap')}</Label>
                      <Input placeholder="imap.gmail.com:993" className="rounded-xl glass-input h-9 text-sm" />
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

  const roleLabel = (role: string) => role === 'admin' ? t('user.role.admin') : role === 'supervisor' ? t('user.role.supervisor') : role === 'agent' ? t('user.role.agent') : role
  const roleBadge = (role: string) => role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : role === 'supervisor' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'

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
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" className="flex-1 rounded-xl glass-input h-9 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleInvite()} />
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
          staffList.map((agent, idx) => (
            <div key={agent.id} className="glass-card rounded-xl p-4 flex items-center gap-3.5 transition-all duration-200 hover:shadow-sm card-lift">
              <Avatar className={cn('h-10 w-10', GRADIENT_CLASSES[idx % GRADIENT_CLASSES.length])}>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══ MAIN PAGE ═══
export default function SettingsPage() {
  const router = useRouter()
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

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
