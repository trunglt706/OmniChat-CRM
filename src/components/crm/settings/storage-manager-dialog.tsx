'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HardDrive, Trash2, RefreshCw, AlertTriangle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch, apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { formatFileSize } from '@/lib/utils'
import { useT } from '@/i18n/useT'

export function StorageManagerDialog() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [clearPassword, setClearPassword] = useState('')
  const [syncing, setSyncing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/storage/files')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setFiles(data.files)
      }
    } catch (e) {
      toast.error('Failed to load storage data')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const handleDelete = async (fileName: string) => {
    try {
      const res = await apiFetch('/api/storage/files', {
        method: 'DELETE',
        body: JSON.stringify({ fileName })
      })
      if (res) {
        toast.success(t('settings.storage.deleted').replace('{fileName}', fileName))
        fetchData()
      } else {
        toast.error(t('settings.storage.deleteFailed'))
      }
    } catch (e) {
      toast.error(t('settings.storage.deleteFailed'))
    }
  }

  const handleClearAll = async () => {
    if (!clearPassword) {
      toast.error(t('settings.storage.passwordRequired'))
      return
    }
    try {
      const data = await apiPost('/api/storage/clear', { password: clearPassword })
      if (data) {
        toast.success(t('settings.storage.cleared'))
        setClearPassword('')
        fetchData()
      } else {
        toast.error(data.error || t('settings.storage.clearFailed'))
      }
    } catch (e) {
      toast.error(t('settings.storage.clearFailed'))
    }
  }

  const handleSync = async () => {
    const from = stats?.driver
    const to = from === 'file' ? 's3' : 'file'
    
    setSyncing(true)
    try {
      const data = await apiPost('/api/storage/sync', { from, to })
      if (data) {
        toast.success(
          t('settings.storage.synced')
            .replace('{synced}', data.synced)
            .replace('{errors}', data.errors)
        )
      } else {
        toast.error(data.error || t('settings.storage.syncFailed'))
      }
    } catch (e) {
      toast.error(t('settings.storage.syncFailed'))
    }
    setSyncing(false)
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-border/40 text-xs">
          <HardDrive className="h-3.5 w-3.5" />
          {t('settings.storage.manage')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden glass border-border/40">
        <DialogHeader className="px-6 py-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            {t('settings.storage.manager')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t('settings.storage.currentDriver')}</div>
              <div className="text-xl font-bold uppercase">{stats?.driver || '-'}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t('settings.storage.totalFiles')}</div>
              <div className="text-xl font-bold">{stats?.totalFiles || 0}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t('settings.storage.totalSize')}</div>
              <div className="text-xl font-bold">{formatFileSize(stats?.totalSize || 0)}</div>
            </div>
          </div>

          {/* Sync */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div>
              <h4 className="font-semibold text-sm">{t('settings.storage.sync')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settings.storage.syncDesc')
                  .replace('{driver}', stats?.driver || '')
                  .replace('{target}', stats?.driver === 'file' ? 's3' : 'file')}
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing || !stats} variant="outline" size="sm" className="gap-2 border-indigo-500/30">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('settings.storage.syncing') : t('settings.storage.syncNow')}
            </Button>
          </div>

          {/* Clear All */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-rose-600 dark:text-rose-400">{t('settings.storage.clear')}</h4>
                <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-0.5">
                  {t('settings.storage.clearDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <Input
                type="password"
                placeholder={t('settings.storage.enterPassword')}
                value={clearPassword}
                onChange={e => setClearPassword(e.target.value)}
                className="h-8 text-xs bg-background/50 border-rose-500/30"
              />
              <Button onClick={handleClearAll} disabled={!clearPassword} variant="destructive" size="sm" className="h-8 px-4">
                {t('settings.storage.clearAll')}
              </Button>
            </div>
          </div>

          <Separator className="opacity-40" />

          {/* File List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t('settings.storage.files').replace('{count}', filteredFiles.length.toString())}</h3>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder={t('settings.storage.search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30"
                />
              </div>
            </div>

            <div className="border border-border/40 rounded-xl overflow-hidden">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">{t('settings.storage.loading')}</div>
                ) : filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">{t('settings.storage.noFiles')}</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <HardDrive className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <a href={f.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline truncate block">
                              {f.name}
                            </a>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {formatFileSize(f.size)} • {new Date(f.lastModified).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleDelete(f.name)}
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
