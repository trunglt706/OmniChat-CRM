'use client'

import { useState, useEffect, useRef } from 'react'
import { useCRMStore, type UserProfile } from '@/store/crm-store'
import { apiPut } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Camera, Check, X, Shield, Clock, MessageSquare, User, Pencil, Loader2,
} from 'lucide-react'
import { GRADIENT_CLASSES, STATUS_OPTIONS } from '@/lib/const/setting'
import { SettingRow, SectionHeader } from './shared'
import { cachedFetch } from './cached-fetch'

interface AgentStats {
  conversationsToday: number
  avgResponse: string
  avgRating: string
  totalConversations: number
}

export default function ProfileTab() {
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
