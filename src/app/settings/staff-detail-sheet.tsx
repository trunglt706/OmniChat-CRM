'use client'

import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LoadingBlock, LoadingSpinner } from '@/components/ui/loading'
import { useT } from '@/i18n/useT'
import { cachedFetch } from './cached-fetch'
import { apiPut, apiPatch, apiDelete } from '@/lib/api-client'
import {
  UserCircle, Lock, Unlock, Key, Activity, MonitorSmartphone, Shield, Check, Trash2, ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface StaffDetailSheetProps {
  userId: number | null
  onClose: () => void
  onUpdated?: () => void
}

export function StaffDetailSheet({ userId, onClose, onUpdated }: StaffDetailSheetProps) {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    if (!userId) return
    let mounted = true
    const loadUser = async () => {
      setLoading(true)
      try {
        const data = await cachedFetch(`/api/staff/${userId}`, {}, true) // true to skip cache
        if (mounted && data.user) {
          setUser(data.user)
          setStats(data.stats)
          setEditForm({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            status: data.user.status,
            password: '',
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadUser()
    return () => { mounted = false }
  }, [userId])

  useEffect(() => {
    if (!userId || activeTab !== 'logs') return
    const loadLogs = async () => {
      try {
        const data = await cachedFetch(`/api/staff/${userId}/logs`, {}, true)
        if (data.logs) setLogs(data.logs)
      } catch (e) {}
    }
    loadLogs()
  }, [userId, activeTab])

  useEffect(() => {
    if (!userId || activeTab !== 'sessions') return
    const loadSessions = async () => {
      try {
        const data = await cachedFetch(`/api/staff/${userId}/sessions`, {}, true)
        if (data.sessions) setSessions(data.sessions)
      } catch (e) {}
    }
    loadSessions()
  }, [userId, activeTab])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status
      }
      if (editForm.password) payload.password = editForm.password
      
      const res = await apiPut(`/api/staff/${userId}`, payload)
      if (res.ok) {
        setUser(res.user)
        setEditForm(prev => ({ ...prev, password: '' }))
        if (onUpdated) onUpdated()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const toggleLock = async () => {
    if (!userId || !user) return
    try {
      const newStatus = !user.isActive
      const res = await apiPatch(`/api/staff/${userId}`, { isActive: newStatus })
      if (res.ok) {
        setUser(prev => ({ ...prev, isActive: res.user.isActive }))
        if (onUpdated) onUpdated()
      }
    } catch (e) {}
  }

  const handleRevokeSession = async (tokenId: string) => {
    if (!userId) return
    try {
      const res = await apiDelete(`/api/staff/${userId}/sessions`, { tokenId })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.token !== tokenId))
      }
    } catch (e) {}
  }

  if (!userId) return null

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/20">
        <div className="flex-1 overflow-y-auto">
          {loading || !user ? (
            <LoadingBlock spinnerSize="xl" className="h-full" />
          ) : (
            <div className="p-6 space-y-6">
              <SheetHeader className="text-left space-y-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        {user.name}
                        {!user.isActive && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{t('staff.detail.lockedBadge')}</Badge>}
                      </SheetTitle>
                      <SheetDescription className="text-sm">
                        {user.email}
                      </SheetDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 bg-foreground/[0.02] p-1 rounded-xl h-12">
                  <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"><UserCircle className="w-3.5 h-3.5 mr-1.5"/>{t('staff.detail.tabs.overview')}</TabsTrigger>
                  <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"><Activity className="w-3.5 h-3.5 mr-1.5"/>{t('staff.detail.tabs.performance')}</TabsTrigger>
                  <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"><MonitorSmartphone className="w-3.5 h-3.5 mr-1.5"/>{t('staff.detail.tabs.sessions')}</TabsTrigger>
                  <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"><Shield className="w-3.5 h-3.5 mr-1.5"/>{t('staff.detail.tabs.logs')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6 space-y-6 animate-fade-in">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">{t('staff.detail.basicInfo')}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('staff.detail.fullName')}</Label>
                        <Input value={editForm.name} onChange={e => setEditForm(f=>({...f, name: e.target.value}))} className="rounded-xl h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('staff.detail.email')}</Label>
                        <Input value={editForm.email} onChange={e => setEditForm(f=>({...f, email: e.target.value}))} className="rounded-xl h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('staff.detail.newPassword')}</Label>
                        <Input type="password" placeholder="••••••••" value={editForm.password} onChange={e => setEditForm(f=>({...f, password: e.target.value}))} className="rounded-xl h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('staff.detail.role')}</Label>
                        <Select value={editForm.role} onValueChange={v => setEditForm(f=>({...f, role: v}))}>
                          <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('user.role.admin')}</SelectItem>
                            <SelectItem value="supervisor">{t('user.role.supervisor')}</SelectItem>
                            <SelectItem value="agent">{t('user.role.agent')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSave} disabled={saving} className="rounded-xl h-9 bg-gradient-to-r from-indigo-500 to-violet-500">
                        {saving ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                        {t('staff.detail.saveInfo')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border/40" />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-red-500 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {t('staff.detail.dangerZone')}</h4>
                    <div className="glass-card border-red-500/20 bg-red-500/5 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{user.isActive ? t('staff.detail.lockAccount') : t('staff.detail.unlockAccount')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {user.isActive ? t('staff.detail.lockDesc') : t('staff.detail.unlockDesc')}
                        </p>
                      </div>
                      <Button 
                        variant={user.isActive ? 'destructive' : 'default'}
                        className="rounded-lg h-9"
                        onClick={toggleLock}
                      >
                        {user.isActive ? <Lock className="w-4 h-4 mr-1.5" /> : <Unlock className="w-4 h-4 mr-1.5" />}
                        {user.isActive ? t('staff.detail.lockBtn') : t('staff.detail.unlockBtn')}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-6 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('staff.detail.totalConversations')}</p>
                      <p className="text-2xl font-bold">{stats?.conversations || 0}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('staff.detail.leadsHandled')}</p>
                      <p className="text-2xl font-bold">{stats?.leads || 0}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('staff.detail.avgResponseTime')}</p>
                      <p className="text-2xl font-bold">{stats?.avgResponse}s</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('staff.detail.satisfactionScore')}</p>
                      <p className="text-2xl font-bold text-amber-500">{stats?.satisfaction} / 5.0</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sessions" className="mt-6 animate-fade-in space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-10">{t('staff.detail.noSessions')}</p>
                  ) : sessions.map(session => (
                    <div key={session.id} className="glass-card p-4 rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <MonitorSmartphone className="w-8 h-8 text-muted-foreground/40" />
                        <div>
                          <p className="text-sm font-medium">{session.userAgent || t('staff.detail.unknownDevice')}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>IP: {session.ipAddress}</span>
                            <span>•</span>
                            <span>{new Date(session.lastActive).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRevokeSession(session.token)} className="text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="logs" className="mt-6 animate-fade-in">
                   {logs.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-10">{t('staff.detail.noLogs')}</p>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {logs.map(log => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border border-background bg-muted-foreground/20 text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow"></div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-xl glass-card">
                            <p className="text-xs font-semibold capitalize mb-1">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                            {log.ipAddress && <p className="text-[10px] text-muted-foreground/60 mt-1">IP: {log.ipAddress}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
