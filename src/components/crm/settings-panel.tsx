'use client'

import { useState, useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import {
  Volume2, Monitor, Mail, Maximize2, Eye,
  UserCheck, Globe, Moon, Sun, Trash2, RotateCcw,
  Wifi, Loader2, CheckCircle, XCircle, AlertTriangle,
  Radio, HardDrive
} from 'lucide-react'
import { useT } from '@/i18n/useT'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/translations'
import { StorageManagerDialog } from './settings/storage-manager-dialog'

function SettingRow({
  icon: Icon, label, description, children,
}: {
  icon: React.ElementType; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl transition-all duration-200 hover:bg-foreground/[0.03] group">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-foreground/[0.04] group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 group-hover:scale-105">
          <Icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium group-hover:text-foreground transition-colors">{label}</p>
          {description && <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

interface TestResult {
  passed: boolean
  config?: Record<string, unknown>
  transport?: Record<string, unknown>
  errors?: string[]
  warnings?: string[]
  checks?: Record<string, { status: string; latency?: number; detail?: string }>
}

export default function SettingsPanel() {
  const settings = useCRMStore((s) => s.settings)
  const updateSettings = useCRMStore((s) => s.updateSettings)
  const notifications = useCRMStore((s) => s.notifications)
  const clearAllNotifications = useCRMStore((s) => s.clearAllNotifications)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { t } = useT()
  useEffect(() => { setMounted(true) }, [])

  // ── Test states ──
  const [wsTesting, setWsTesting] = useState(false)
  const [wsResult, setWsResult] = useState<TestResult | null>(null)
  const [rtTesting, setRtTesting] = useState(false)
  const [rtResult, setRtResult] = useState<TestResult | null>(null)

  const runWsTest = async () => {
    setWsTesting(true)
    setWsResult(null)
    try {
      const res = await fetch('/api/ws/test')
      setWsResult(await res.json())
    } catch (e) {
      setWsResult({ passed: false, errors: [String(e)] })
    } finally { setWsTesting(false) }
  }

  const runRtTest = async () => {
    setRtTesting(true)
    setRtResult(null)
    try {
      const res = await fetch('/api/realtime/test')
      setRtResult(await res.json())
    } catch (e) {
      setRtResult({ passed: false, errors: [String(e)] })
    } finally { setRtTesting(false) }
  }

  const renderTestResult = (result: TestResult) => (
    <div className={cn(
      'rounded-xl p-3 text-xs space-y-2 animate-slide-up',
      result.passed
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30'
        : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30'
    )}>
      <div className="flex items-center gap-1.5 font-semibold">
        {result.passed
          ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> {t('settings.ws.testPassed')}</>
          : <><XCircle className="h-3.5 w-3.5 text-rose-600" /> {t('settings.ws.testFailed')}</>
        }
      </div>
      {/* Config summary */}
      {result.config && typeof result.config === 'object' ? (
        <div className="space-y-0.5">
          {Object.entries(result.config as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="text-muted-foreground/60">{k}</span>
              <span className="font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {/* Transport details */}
      {result.transport?.sse && (result.transport.sse as Record<string, unknown>).alive ? (
        <div className="flex items-center gap-1.5 text-emerald-600">
          <Wifi className="h-3 w-3" />
          SSE: {t('settings.ws.connected')} ({String((result.transport.sse as Record<string, unknown>).latency)}ms)
        </div>
      ) : null}
      {result.transport?.websocket && (result.transport.websocket as Record<string, unknown>).alive ? (
        <div className="flex items-center gap-1.5 text-emerald-600">
          <Wifi className="h-3 w-3" />
          WebSocket: {t('settings.ws.connected')} ({String((result.transport.websocket as Record<string, unknown>).latency)}ms)
        </div>
      ) : null}
      {/* Errors */}
      {result.errors && result.errors.length > 0 && (
        <div className="space-y-0.5">
          {result.errors.map((err, i) => (
            <div key={i} className="text-rose-600 flex items-start gap-1.5">
              <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="space-y-0.5">
          {result.warnings.map((w, i) => (
            <div key={i} className="text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderRtTestResult = (result: TestResult) => (
    <div className={cn(
      'rounded-xl p-3 text-xs space-y-2 animate-slide-up',
      result.passed
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30'
        : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30'
    )}>
      <div className="flex items-center gap-1.5 font-semibold">
        {result.passed
          ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> {t('settings.ws.testPassed')}</>
          : <><XCircle className="h-3.5 w-3.5 text-rose-600" /> {t('settings.ws.testFailed')}</>
        }
      </div>
      {/* Checks */}
      {result.checks && (
        <div className="space-y-1.5">
          {Object.entries(result.checks).map(([key, check]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {check.status === 'ok' && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                {check.status === 'fail' && <XCircle className="h-3 w-3 text-rose-500" />}
                {check.status === 'skip' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              </div>
              <span className="text-muted-foreground/60 text-[10px]">
                {check.latency ? `${check.latency}ms` : check.detail?.slice(0, 40)}
              </span>
            </div>
          ))}
        </div>
      )}
      {result.errors && result.errors.length > 0 && (
        <div className="space-y-0.5">
          {result.errors.map((err, i) => (
            <div key={i} className="text-rose-600 flex items-start gap-1.5">
              <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

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
            icon={mounted && theme === 'dark' ? Moon : Sun}
            label={t('settings.theme')}
            description={t('settings.themeDesc')}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs gap-1.5 border-border/40"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && (theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />)}
              {mounted ? (theme === 'dark' ? t('settings.dark') : t('settings.light')) : ''}
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

          <SettingRow
            icon={HardDrive}
            label={t('settings.storage')}
            description={t('settings.storage.desc')}
          >
            <StorageManagerDialog />
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

        {/* WebSocket & Realtime */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">
            {t('settings.ws.title')}
          </h4>

          <SettingRow
            icon={Radio}
            label={t('settings.ws.connectionTest')}
            description={t('settings.ws.connectionTestDesc')}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs gap-1.5 border-border/40"
              onClick={runWsTest}
              disabled={wsTesting}
            >
              {wsTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
              {wsTesting ? t('channels.testing') : t('channels.testConnection')}
            </Button>
          </SettingRow>

          {wsResult && renderTestResult(wsResult)}

          <SettingRow
            icon={Radio}
            label={t('settings.ws.realtimeTest')}
            description={t('settings.ws.realtimeTestDesc')}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs gap-1.5 border-border/40"
              onClick={runRtTest}
              disabled={rtTesting}
            >
              {rtTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
              {rtTesting ? t('channels.testing') : t('settings.ws.runRealtimeTest')}
            </Button>
          </SettingRow>

          {rtResult && renderRtTestResult(rtResult)}
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
            onClick={async () => {
              const defaults = {
                soundEnabled: true, desktopNotifEnabled: true, emailNotifEnabled: false,
                compactMode: false, showPreview: true, autoAssign: true, language: settings.language,
              }
              updateSettings(defaults)
              try { await fetch('/api/auth/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaults) }) } catch {}
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