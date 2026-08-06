'use client'

import { useState, useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { apiPut } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES } from '@/i18n/translations'
import { Volume2, Monitor, Mail, Maximize2, Eye, Globe, UserCheck, Moon, Sun, Bell, Trash2, Check, X, Clock, Calendar } from 'lucide-react'
import { SettingRow, SectionHeader } from './shared'
import { TIMEZONE_OPTIONS, TIME_FORMAT_OPTIONS } from '@/lib/const/setting'

export default function SystemTab() {
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

  const systemSettings = useCRMStore((s) => s.systemSettings)
  const setSystemSettings = useCRMStore((s) => s.setSystemSettings)

  const handleUpdateSystemSetting = async (patch: Record<string, string>) => {
    const newSystemSettings = { ...systemSettings, ...patch }
    setSystemSettings(newSystemSettings)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        setStatusModal({ type: 'success', text: t('settings.saveSuccess') })
      } else {
        setStatusModal({ type: 'error', text: t('settings.saveFailed') })
      }
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
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader title={t('settings.timeConfig') || "Thời gian & Múi giờ"} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Globe} label={t('settings.timezone') || "Múi giờ hệ thống"} description={t('settings.timezoneDesc') || "Áp dụng chung cho tất cả thành viên"}>
            <Select value={systemSettings.sys_timezone || 'Asia/Ho_Chi_Minh'} onValueChange={(v) => handleUpdateSystemSetting({ sys_timezone: v })}>
              <SelectTrigger className="w-40 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value} className="text-xs">{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Calendar} label={t('settings.timeFormat') || "Định dạng thời gian"} description={t('settings.timeFormatDesc') || "Cách hiển thị ngày giờ"}>
            <Select value={systemSettings.sys_time_format || 'dd/MM/yyyy HH:mm'} onValueChange={(v) => handleUpdateSystemSetting({ sys_time_format: v })}>
              <SelectTrigger className="w-48 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_OPTIONS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value} className="text-xs">{fmt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader title={t('settings.notifications')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Volume2} label={t('settings.soundNotif')} description={t('settings.soundNotifDesc')}>
            <Switch checked={settings.soundEnabled} onCheckedChange={(v) => handleUpdateSetting({ soundEnabled: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Bell} label={t('settings.desktopNotif')} description={t('settings.desktopNotifDesc')}>
            <Switch checked={settings.desktopNotifications} onCheckedChange={(v) => handleUpdateSetting({ desktopNotifications: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Monitor} label={t('settings.messagePreview')} description={t('settings.messagePreviewDesc')}>
            <Switch checked={settings.messagePreview} onCheckedChange={(v) => handleUpdateSetting({ messagePreview: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          {notifCount > 0 && (
            <div className="pt-2 flex justify-end">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/50 hover:text-destructive gap-1" onClick={clearAllNotifications}>
                <Trash2 className="h-3 w-3" /> {t('settings.clearNotifs')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader title={t('settings.chat')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Eye} label={t('settings.autoAssign')} description={t('settings.autoAssignDesc')}>
            <Switch checked={settings.autoAssign} onCheckedChange={(v) => handleUpdateSetting({ autoAssign: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={Globe} label={t('settings.language')} description={t('settings.languageDesc')}>
            <Select value={settings.language} onValueChange={(v) => handleUpdateSetting({ language: v })}>
              <SelectTrigger className="w-32 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCALES.map((loc) => (
                  <SelectItem key={loc} value={loc} className="text-xs">{LOCALE_LABELS[loc]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader title={t('settings.quickReplies')} />
        <div className="glass-card rounded-2xl p-5">
          <SettingRow icon={Mail} label={t('settings.emailNotif')} description={t('settings.emailNotifDesc')}>
            <Switch checked={settings.emailNotification} onCheckedChange={(v) => handleUpdateSetting({ emailNotification: v })} />
          </SettingRow>
          <Separator className="opacity-30 my-1" />
          <SettingRow icon={UserCheck} label={t('settings.customerPanel')} description={t('settings.customerPanelDesc')}>
            <Switch checked={settings.showCustomerPanel} onCheckedChange={(v) => handleUpdateSetting({ showCustomerPanel: v })} />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}
