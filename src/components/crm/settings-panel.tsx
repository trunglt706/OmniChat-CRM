'use client'

import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import {
  Volume2, Monitor, Mail, Palette, Maximize2, Eye,
  UserCheck, Globe, Moon, Sun, Trash2, RotateCcw,
} from 'lucide-react'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/translations'

function SettingRow({
  icon: Icon, label, description, children,
}: {
  icon: React.ElementType; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
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

export default function SettingsPanel() {
  const { settings, updateSettings, notifications, clearAllNotifications } = useCRMStore()
  const { theme, setTheme } = useTheme()
  const { t } = useT()

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-up">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-bold tracking-tight">{t('settings.title')}</h2>
      </div>
      <Separator className="opacity-40" />

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Appearance */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">
            {t('settings.appearance')}
          </h4>
          <SettingRow
            icon={theme === 'dark' ? Moon : Sun}
            label={t('settings.theme')}
            description={t('settings.themeDesc')}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs gap-1.5 border-border/40"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {theme === 'dark' ? t('settings.dark') : t('settings.light')}
            </Button>
          </SettingRow>

          <SettingRow
            icon={Maximize2}
            label={t('settings.compactMode')}
            description={t('settings.compactModeDesc')}
          >
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(v) => updateSettings({ compactMode: v })}
            />
          </SettingRow>

          <SettingRow
            icon={Eye}
            label={t('settings.showPreview')}
            description={t('settings.showPreviewDesc')}
          >
            <Switch
              checked={settings.showPreview}
              onCheckedChange={(v) => updateSettings({ showPreview: v })}
            />
          </SettingRow>

          <SettingRow
            icon={Globe}
            label={t('settings.language')}
          >
            <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as Locale })}>
              <SelectTrigger className="w-28 h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((locale) => (
                  <SelectItem key={locale} value={locale}>{LOCALE_LABELS[locale]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>

        <Separator className="opacity-30" />

        {/* Notifications */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">
            {t('settings.notifications')}
          </h4>

          <SettingRow
            icon={Volume2}
            label={t('settings.sound')}
            description={t('settings.soundDesc')}
          >
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
            />
          </SettingRow>

          <SettingRow
            icon={Monitor}
            label={t('settings.desktopNotif')}
            description={t('settings.desktopNotifDesc')}
          >
            <Switch
              checked={settings.desktopNotifEnabled}
              onCheckedChange={(v) => updateSettings({ desktopNotifEnabled: v })}
            />
          </SettingRow>

          <SettingRow
            icon={Mail}
            label={t('settings.emailNotif')}
            description={t('settings.emailNotifDesc')}
          >
            <Switch
              checked={settings.emailNotifEnabled}
              onCheckedChange={(v) => updateSettings({ emailNotifEnabled: v })}
            />
          </SettingRow>

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-9 rounded-xl text-xs text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
              onClick={() => clearAllNotifications()}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t('settings.clearAllNotifs', { count: notifications.length })}
            </Button>
          )}
        </div>

        <Separator className="opacity-30" />

        {/* Conversation */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">
            {t('settings.conversations')}
          </h4>

          <SettingRow
            icon={UserCheck}
            label={t('settings.autoAssign')}
            description={t('settings.autoAssignDesc')}
          >
            <Switch
              checked={settings.autoAssign}
              onCheckedChange={(v) => updateSettings({ autoAssign: v })}
            />
          </SettingRow>
        </div>

        <Separator className="opacity-30" />

        {/* Danger zone */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">
            {t('settings.data')}
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 rounded-xl text-xs border-border/40 hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => {
              localStorage.removeItem('omnichat_settings')
              updateSettings({
                soundEnabled: true, desktopNotifEnabled: true, emailNotifEnabled: false,
                compactMode: false, showPreview: true, autoAssign: true, language: settings.language,
              })
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {t('settings.resetDefaults')}
          </Button>
        </div>
      </div>
    </div>
  )
}
