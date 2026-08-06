'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiPut, apiPost, apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { ShieldAlert, Zap, Clock, Ban, Trash2, Check, X, Loader2 } from 'lucide-react'
import { LoadingBlock } from '@/components/ui/loading'
import { SettingRow, SectionHeader } from './shared'
import logger from '@/lib/logger'
import { cachedFetch } from './cached-fetch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BlacklistItem {
  id?: string
  type: string
  value: string
  reason?: string
  addedAt: string
  createdAt?: string
}

export default function SecurityTab() {
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
  const [confirmRemove, setConfirmRemove] = useState<{ type: string; value: string; reason?: string } | null>(null)
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
    } catch (e) { logger.error('Failed to load security config', { context: 'SecurityTab', error: e }) }
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
    } catch (e) { logger.error('Failed to add to blacklist', { context: 'SecurityTab', error: e }) }
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

  if (loading) {
    return <LoadingBlock spinnerSize="xl" className="py-20 text-muted-foreground/40" />
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
