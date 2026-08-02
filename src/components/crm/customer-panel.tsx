'use client'

import { useEffect, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useT } from '@/i18n/useT'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
// Native scroll
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CHANNEL_CONFIG, LEAD_STATUS_CONFIG, type InternalNote } from '@/lib/types'
import type { Lead } from '@/lib/types'
import {
  User, Phone, Mail, Building, MapPin, Calendar, MessageCircle, Send,
  Globe, Pin, Plus, Loader2, X, ChevronRight, ExternalLink,
  Copy, CheckCircle2, Clock, Sparkles, Target, TrendingUp,
  Pencil, Trash2, MoreHorizontal, PinOff, Check, Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6', 'avatar-gradient-7', 'avatar-gradient-8']

function PlatformBadge({ platform, userName, index }: { platform: string; userName?: string | null; index: number }) {
  const cfg = CHANNEL_CONFIG[platform as keyof typeof CHANNEL_CONFIG]
  return (
    <div className={cn(
      'flex items-center gap-2.5 text-xs p-2.5 rounded-xl transition-all duration-200 hover:scale-[1.01]',
      'bg-foreground/[0.02] hover:bg-foreground/[0.04]'
    )}>
      <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (cfg?.color || '#6b7280') + '15' }}>
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg?.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{cfg?.label}</p>
        <p className="font-medium truncate text-foreground/90">{userName || platform}</p>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm group">
      <div className="h-8 w-8 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] flex items-center justify-center flex-shrink-0 transition-colors duration-200">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">{label}</p>
        <p className="font-medium truncate text-foreground/85">{value}</p>
      </div>
    </div>
  )
}

function InfoTab() {
  const { conversationDetail } = useCRMStore()
  const { t } = useT()
  if (!conversationDetail) return null

  const customer = conversationDetail.customer
  const identities = customer.identities || []

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Customer name & avatar - premium card */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
              <AvatarFallback className={cn('text-lg text-white font-bold', GRADIENT_CLASSES[0])}>
                {customer.name.split(' ').slice(-2).map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[15px] truncate tracking-tight">{customer.name}</h3>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">
              {t('panel.customerSince', { date: new Date(customer.createdAt).toLocaleDateString('vi-VN') })}
            </p>
          </div>
        </div>
      </div>

      {/* Contact info - grid of info rows */}
      <div className="space-y-1">
        <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1 mb-2">{t('panel.contact')}</h4>
        <div className="space-y-0.5">
          {customer.phone && <InfoRow icon={Phone} label={t('panel.phone')} value={customer.phone} />}
          {customer.email && <InfoRow icon={Mail} label={t('panel.email')} value={customer.email} />}
          {customer.company && <InfoRow icon={Building} label={t('panel.company')} value={customer.company} />}
          {customer.address && <InfoRow icon={MapPin} label={t('panel.address')} value={customer.address} />}
          {customer.birthday && <InfoRow icon={Calendar} label={t('panel.birthday')} value={customer.birthday} />}
        </div>
      </div>

      {/* Platform identities */}
      {identities.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">{t('panel.linkedAccounts')}</h4>
          <div className="space-y-1.5">
            {identities.map((identity, idx) => (
              <PlatformBadge
                key={identity.id}
                platform={identity.platform}
                userName={identity.platformUserName}
                index={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {conversationDetail.tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">{t('panel.tags')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {conversationDetail.tags.map((ct) => (
              <Badge
                key={ct.tag.id}
                variant="outline"
                className="text-[11px] rounded-lg px-2.5 py-0.5 font-medium transition-all duration-200 hover:scale-105"
                style={{ borderColor: ct.tag.color + '40', color: ct.tag.color, backgroundColor: ct.tag.color + '08' }}
              >
                {ct.tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Note from customer profile */}
      {customer.note && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">{t('panel.note')}</h4>
          <div className="bg-foreground/[0.02] rounded-xl p-3 text-xs text-muted-foreground/70 leading-relaxed border border-foreground/[0.04]">
            {customer.note}
          </div>
        </div>
      )}
    </div>
  )
}

function NotesTab() {
  const { selectedConversationId, conversationDetail, notes, setNotes, addNote, updateNote, deleteNote } = useCRMStore()
  const { t } = useT()
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchNotes = async () => {
    if (!selectedConversationId) return
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/notes`)
      const data = await res.json()
      setNotes(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [selectedConversationId, setNotes])

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedConversationId || !conversationDetail) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim(), customerId: conversationDetail.customerId }),
      })
      const note = await res.json()
      addNote(note)
      setNewNote('')
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (note: InternalNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim() || !selectedConversationId) return
    setActionLoadingId(editingId)
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: editingId, content: editContent.trim() }),
      })
      const updated = await res.json()
      updateNote(editingId, updated)
      setEditingId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleTogglePin = async (note: InternalNote) => {
    if (!selectedConversationId) return
    setActionLoadingId(note.id)
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, isPinned: !note.isPinned }),
      })
      const updated = await res.json()
      updateNote(note.id, updated)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!selectedConversationId) return
    setActionLoadingId(noteId)
    try {
      await fetch(`/api/conversations/${selectedConversationId}/notes?noteId=${noteId}`, { method: 'DELETE' })
      deleteNote(noteId)
      setDeleteConfirmId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderNoteCard = (note: InternalNote, idx: number) => {
    const isEditing = editingId === note.id
    const isLoading = actionLoadingId === note.id

    return (
      <div
        key={note.id}
        className={cn(
          'rounded-xl p-3.5 transition-all duration-200 animate-slide-up group',
          note.isPinned
            ? 'bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 hover:shadow-sm hover:shadow-amber-500/5'
            : 'bg-foreground/[0.02] hover:bg-foreground/[0.04]'
        )}
        style={{ animationDelay: `${idx * 50}ms` }}
      >
        {isEditing ? (
          <div className="space-y-2.5">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-[13px] min-h-[60px] resize-none rounded-lg glass-input focus-visible:ring-0"
              autoFocus
            />
            <div className="flex gap-1.5 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg" onClick={handleCancelEdit}>
                <Ban className="h-3 w-3 mr-1" /> {t('notes.cancel')}
              </Button>
              <Button size="sm" className="h-7 text-[11px] rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500" onClick={handleSaveEdit} disabled={!editContent.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                {t('notes.save')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {note.isPinned && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1.5">
                <Pin className="h-2.5 w-2.5" /> {t('notes.pinned')}
              </div>
            )}
            <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground/50 font-medium">{note.author.name} · {new Date(note.createdAt).toLocaleString('vi-VN')}</p>
              <div className={cn('flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200', deleteConfirmId === note.id && 'opacity-100')}>
                {deleteConfirmId === note.id ? (
                  <>
                    <span className="text-[10px] text-destructive font-medium mr-1">{t('notes.deleteConfirm')}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleDelete(note.id)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-destructive" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => setDeleteConfirmId(null)}>
                      <Ban className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40" onClick={() => handleTogglePin(note)} disabled={isLoading} title={note.isPinned ? t('notes.unpin') : t('notes.pin')}>
                      {note.isPinned ? <PinOff className="h-3 w-3 text-amber-500" /> : <Pin className="h-3 w-3 text-muted-foreground/50" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleEdit(note)} disabled={isLoading} title={t('notes.edit')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setDeleteConfirmId(note.id)} disabled={isLoading} title={t('notes.delete')}>
                      <Trash2 className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const pinnedNotes = notes.filter(n => n.isPinned)
  const regularNotes = notes.filter(n => !n.isPinned)

  return (
    <div className="space-y-3 animate-fade-in">
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.map((note, idx) => renderNoteCard(note, idx))}
        </div>
      )}
      <div className="space-y-2">
        {regularNotes.length > 0 && pinnedNotes.length > 0 && (
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">{t('notes.all')}</h4>
        )}
        {regularNotes.map((note, idx) => renderNoteCard(note, idx))}
      </div>
      {notes.length === 0 && !isSubmitting && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
          <div className="h-12 w-12 rounded-xl bg-foreground/[0.02] flex items-center justify-center mb-3">
            <MessageCircle className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium">{t('notes.empty')}</p>
          <p className="text-[10px] mt-0.5 text-muted-foreground/30">{t('notes.emptyDesc')}</p>
        </div>
      )}
      <div className="space-y-2.5 pt-3 border-t border-border/30">
        <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('notes.placeholder')} className="text-[13px] min-h-[70px] resize-none rounded-xl glass-input focus-visible:ring-0" />
        <Button onClick={handleAddNote} disabled={!newNote.trim() || isSubmitting} size="sm" className={cn('w-full text-xs h-9 rounded-xl font-medium transition-all duration-200', newNote.trim() && 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-md shadow-indigo-500/20')}>
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
          {t('notes.add')}
        </Button>
      </div>
    </div>
  )
}

function LeadTab() {
  const { conversationDetail } = useCRMStore()
  const { t } = useT()
  if (!conversationDetail) return null

  const leads = conversationDetail.leads || []

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-foreground/[0.02] flex items-center justify-center mb-4">
          <Target className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium">{t('lead.empty')}</p>
        <p className="text-[11px] mt-1 text-muted-foreground/30">{t('lead.emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {leads.map((lead) => {
        const statusCfg = LEAD_STATUS_CONFIG[lead.status]
        return (
          <div key={lead.id} className="glass-card rounded-2xl p-4 space-y-3 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <Badge className={cn('text-[11px] px-2.5 py-0.5 h-[22px] rounded-lg font-medium', statusCfg?.color)}>
                {statusCfg?.label}
              </Badge>
              {lead.value && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {(lead.value / 1000000).toFixed(0)}M <span className="text-[10px] font-medium text-muted-foreground/60">VNĐ</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-foreground/[0.02] rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">{t('lead.source')}</span>
                <p className="font-semibold text-xs mt-0.5">{lead.source || '-'}</p>
              </div>
              <div className="bg-foreground/[0.02] rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">{t('lead.probability')}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-foreground/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${lead.probability}%` }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums">{lead.probability}%</span>
                </div>
              </div>
              <div className="bg-foreground/[0.02] rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">{t('lead.followup')}</span>
                <p className="font-semibold text-xs mt-0.5">
                  {lead.nextFollowup
                    ? new Date(lead.nextFollowup).toLocaleDateString('vi-VN')
                    : '-'}
                </p>
              </div>
              <div className="bg-foreground/[0.02] rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">Owner</span>
                <p className="font-semibold text-xs mt-0.5">{lead.owner?.name || '-'}</p>
              </div>
            </div>
            {lead.campaign && (
              <div className="text-xs text-muted-foreground/60">
                <span className="font-medium text-muted-foreground/40">Campaign: </span>
                <span className="font-medium">{lead.campaign}</span>
              </div>
            )}
            {lead.notes && (
              <div className="bg-foreground/[0.02] rounded-lg p-2.5 text-xs text-muted-foreground/60 leading-relaxed border border-foreground/[0.03]">
                {lead.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CustomerPanel() {
  const { selectedConversationId, conversationDetail, rightPanelTab, setRightPanelTab } = useCRMStore()
  const { t } = useT()

  if (!selectedConversationId || !conversationDetail) {
    return (
      <div className="h-full flex items-center justify-center animate-fade-in">
        <div className="text-center text-muted-foreground/40">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-foreground/[0.02] flex items-center justify-center">
            <User className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">{t('panel.selectConvo')}</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { value: 'info', label: t('panel.tab.info') },
    { value: 'notes', label: t('panel.tab.notes') },
    { value: 'lead', label: t('panel.tab.lead') },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <div className="px-4 pt-3 pb-0">
        <div className="flex gap-1 p-1 bg-foreground/[0.03] rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRightPanelTab(tab.value as 'info' | 'notes' | 'lead')}
              className={cn(
                'flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all duration-250',
                rightPanelTab === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground/60 hover:text-foreground/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
          {rightPanelTab === 'info' && <InfoTab />}
          {rightPanelTab === 'notes' && <NotesTab />}
          {rightPanelTab === 'lead' && <LeadTab />}
        </div>
      </div>
    </div>
  )
}
