'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { apiPut, apiPost, apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import { Database, Download, Upload, RefreshCw, Trash2, RotateCcw, Plus, HardDrive, Loader2, Check, AlertTriangle } from 'lucide-react'
import { SettingRow, SectionHeader } from './shared'
import { cachedFetch } from './cached-fetch'

interface BackupItem { id: string; filename: string; size: number; createdAt: string; type: string }

export default function BackupTab() {
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
