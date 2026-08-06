'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/useT'
import type { Agent } from '@/lib/types'
import {
  Clock, Star, MoreVertical, Plus,
  Trash2, X, Check, MessageSquare, ChevronDown, Send,
} from 'lucide-react'
import { cachedFetch } from './cached-fetch'
import logger from '@/lib/logger'
import { GRADIENT_CLASSES } from '@/lib/const/setting'

export default function StaffTab() {
  const agents = useCRMStore((s) => s.agents)
  const setAgents = useCRMStore((s) => s.setAgents)
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('agent')
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'agent', status: 'online' })

  // Generate stable mock stats per agent
  const staffStats = useMemo(() => {
    const stats: Record<number, { conversations: number; avgResponse: number; satisfaction: number; lastActive: string }> = {}
    agents.forEach((agent) => {
      // Simple deterministic hash from agent id
      const hash = String(agent.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const conversations = 100 + (hash * 7) % 500
      const avgResponse = 60 + (hash * 13) % 120 // 1-3 min in seconds
      const satisfaction = 4.0 + ((hash * 3) % 10) / 10 // 4.0-5.0
      const daysAgo = (hash * 11) % 30
      const hoursAgo = (hash * 7) % 24
      const lastActive = daysAgo === 0
        ? t('common.time.hoursAgo', { h: hoursAgo })
        : t('common.time.daysAgo', { d: daysAgo })
      stats[agent.id] = { conversations, avgResponse, satisfaction, lastActive }
    })
    return stats
  }, [agents])

  useEffect(() => {
    if (agents.length > 0) { setLoading(false); return }
    async function load() {
      try {
        const data = await cachedFetch('/api/agents')
        if (Array.isArray(data)) { setAgents(data) }
      } catch (e) { logger.error('Failed to load agents', { context: 'StaffTab', error: e }) }
      finally { setLoading(false) }
    }
    load()
  }, [agents.length, setAgents])

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const newAgent: Agent = { id: Date.now(), name: inviteEmail.split('@')[0], email: inviteEmail, avatar: null, role: inviteRole, status: 'offline' }
    setAgents([...agents, newAgent])
    setInviteEmail('')
    setShowInvite(false)
  }

  const openEditDialog = (agent: Agent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditForm({ name: agent.name, email: agent.email, role: agent.role, status: agent.status })
    setDeleteConfirm(false)
    setEditingAgent(agent)
  }

  const handleSaveEdit = () => {
    if (!editingAgent) return
    const updated = { ...editingAgent, ...editForm }
    const newList = agents.map(a => a.id === editingAgent.id ? updated : a)
    setAgents(newList)
    setEditingAgent(null)
  }

  const handleDelete = () => {
    if (!editingAgent) return
    const newList = agents.filter(a => a.id !== editingAgent.id)
    setAgents(newList)
    setEditingAgent(null)
    setDeleteConfirm(false)
  }

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const roleLabel = (role: string) => role === 'admin' ? t('user.role.admin') : role === 'supervisor' ? t('user.role.supervisor') : role === 'agent' ? t('user.role.agent') : role
  const roleBadge = (role: string) => role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : role === 'supervisor' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'

  const formatResponseTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return min > 0 ? `~${min}m ${sec > 0 ? `${sec}s` : ''}` : `~${sec}s`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{t('staff.title')}</h3>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('staff.count', { count: agents.length })}</p>
        </div>
        <Button size="sm" className="h-8 rounded-xl text-xs gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600" onClick={() => setShowInvite(!showInvite)}>
          <Plus className="h-3.5 w-3.5" /> {t('staff.invite')}
        </Button>
      </div>
      {showInvite && (
        <div className="glass-card rounded-2xl p-5 animate-slide-down">
          <h4 className="text-[13px] font-semibold mb-3">{t('staff.inviteTitle')}</h4>
          <div className="flex gap-2">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t('staff.emailPlaceholder')} className="flex-1 rounded-xl glass-input h-9 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleInvite()} />
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
          agents.map((agent, idx) => {
            const stats = staffStats[agent.id]
            const isExpanded = expandedId === agent.id
            return (
              <div key={agent.id} className="glass-card rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm">
                {/* Main row - clickable to expand */}
                <div
                  className="p-4 flex items-center gap-3.5 cursor-pointer"
                  onClick={() => toggleExpand(agent.id)}
                >
                  <Avatar className={cn('h-10 w-10 flex-shrink-0', GRADIENT_CLASSES[idx % GRADIENT_CLASSES.length])}>
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
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground/30 flex-shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5"
                    onClick={(e) => openEditDialog(agent, e)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                {/* Expanded stats section */}
                {isExpanded && stats && (
                  <div className="px-4 pb-4 pt-0 animate-slide-down">
                    <div className="border-t border-border/20 pt-3 mt-1">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{stats.conversations}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.totalConversations')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{formatResponseTime(stats.avgResponse)}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.avgResponse')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Star className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
                          <p className="text-sm font-bold tabular-nums">{stats.satisfaction.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.satisfaction')}</p>
                        </div>
                        <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-center">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-sm font-bold">{stats.lastActive}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium">{t('staff.lastActive')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => { if (!open) { setEditingAgent(null); setDeleteConfirm(false) } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('staff.edit')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              {editingAgent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.name')}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.emailLabel')}</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" className="rounded-xl glass-input h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.role')}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('user.role.admin')}</SelectItem>
                    <SelectItem value="supervisor">{t('user.role.supervisor')}</SelectItem>
                    <SelectItem value="agent">{t('user.role.agent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground/70">{t('staff.status')}</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">{t('profile.status.online')}</SelectItem>
                    <SelectItem value="busy">{t('profile.status.busy')}</SelectItem>
                    <SelectItem value="away">{t('profile.status.away')}</SelectItem>
                    <SelectItem value="offline">{t('profile.status.offline')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {!deleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 rounded-lg text-xs"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('staff.delete')}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-500 font-medium">{t('staff.deleteConfirm')}</span>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setDeleteConfirm(false)}>
                  <X className="h-3 w-3 mr-1" /> {t('staff.cancelEdit')}
                </Button>
                <Button variant="destructive" size="sm" className="h-8 rounded-lg text-xs" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> {t('staff.delete')}
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => { setEditingAgent(null); setDeleteConfirm(false) }}>
                {t('staff.cancelEdit')}
              </Button>
              <Button size="sm" className="h-8 rounded-lg text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600" onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" /> {t('staff.save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}