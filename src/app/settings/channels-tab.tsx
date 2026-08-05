'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { apiPut, apiPost } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { CHANNEL_CONFIG } from '@/lib/types'
import { useT } from '@/i18n/useT'
import {
  ChevronDown, Check, X, Loader2, Globe,
  MessageSquare, AlertTriangle, Pencil, Zap,
} from 'lucide-react'
import { SettingRow, SectionHeader } from './shared'
import { cachedFetch } from './cached-fetch'
import {
  type ChannelData,
  CHANNEL_ICONS,
  CHANNEL_COLORS_MAP,
  CHANNEL_NAME_KEYS,
  CHANNEL_DESC_KEYS,
} from '@/lib/const/setting'

export default function ChannelsTab() {
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
