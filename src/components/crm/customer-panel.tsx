'use client'

import { useEffect, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

function PlatformBadge({ platform, userName }: { platform: string; userName?: string | null }) {
  const cfg = CHANNEL_CONFIG[platform as keyof typeof CHANNEL_CONFIG]
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg?.color || '#6b7280' }} />
      <span className="text-muted-foreground">{cfg?.label}:</span>
      <span className="font-medium">{userName || platform}</span>
    </div>
  )
}

function InfoTab() {
  const { conversationDetail } = useCRMStore()
  if (!conversationDetail) return null

  const customer = conversationDetail.customer
  const identities = customer.identities || []

  return (
    <div className="space-y-4">
      {/* Customer name & avatar */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-lg bg-muted">
            {customer.name.split(' ').slice(-2).map((n) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
          <p className="text-xs text-muted-foreground">
            Khách hàng từ {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      <Separator />

      {/* Contact info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thông tin liên hệ</h4>
        {customer.phone && (
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.company && (
          <div className="flex items-center gap-2.5 text-sm">
            <Building className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span>{customer.company}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
        {customer.birthday && (
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span>{customer.birthday}</span>
          </div>
        )}
      </div>

      {/* Platform identities */}
      {identities.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tài khoản liên kết</h4>
            {identities.map((identity) => (
              <PlatformBadge
                key={identity.id}
                platform={identity.platform}
                userName={identity.platformUserName}
              />
            ))}
          </div>
        </>
      )}

      {/* Tags */}
      {conversationDetail.tags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {conversationDetail.tags.map((ct) => (
                <Badge
                  key={ct.tag.id}
                  variant="outline"
                  className="text-[11px]"
                  style={{ borderColor: ct.tag.color, color: ct.tag.color }}
                >
                  {ct.tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Note from customer profile */}
      {customer.note && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú</h4>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md">{customer.note}</p>
          </div>
        </>
      )}
    </div>
  )
}

function NotesTab() {
  const { selectedConversationId, conversationDetail, notes, setNotes, addNote } = useCRMStore()
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <div className="space-y-3">
 {/* Pinned notes */}
      {notes.filter(n => n.isPinned).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <Pin className="h-3 w-3" /> Đã ghim
          </div>
          {notes.filter(n => n.isPinned).map((note) => (
            <div key={note.id} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm">{note.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{note.author.name} · {new Date(note.createdAt).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>
      )}

      {/* All notes */}
      <div className="space-y-2">
        {notes.filter(n => !n.isPinned).map((note) => (
          <div key={note.id} className="bg-muted/40 rounded-lg p-3">
            <p className="text-sm">{note.content}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5">{note.author.name} · {new Date(note.createdAt).toLocaleString('vi-VN')}</p>
          </div>
        ))}
      </div>

      {/* Add note */}
      <div className="space-y-2 pt-2 border-t">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Thêm ghi chú nội bộ..."
          className="text-sm min-h-[60px] resize-none"
        />
        <Button
          onClick={handleAddNote}
          disabled={!newNote.trim() || isSubmitting}
          size="sm" className="w-full text-xs"
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Thêm ghi chú
        </Button>
      </div>
    </div>
  )
}

function LeadTab() {
  const { conversationDetail } = useCRMStore()
  if (!conversationDetail) return null

  const leads = conversationDetail.leads || []

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ChevronRight className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Chưa có Lead nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const statusCfg = LEAD_STATUS_CONFIG[lead.status]
        return (
          <div key={lead.id} className="border border-border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Badge className={cn('text-[11px] px-2 py-0.5 h-5', statusCfg?.color)}>
                {statusCfg?.label}
              </Badge>
              {lead.value && (
                <span className="text-sm font-semibold text-emerald-600">
                  {(lead.value / 1000000).toFixed(0)}M VNĐ
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Nguồn</span>
                <p className="font-medium mt-0.5">{lead.source || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Xác suất</span>
                <p className="font-medium mt-0.5">{lead.probability}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Follow-up</span>
                <p className="font-medium mt-0.5">
                  {lead.nextFollowup
                    ? new Date(lead.nextFollowup).toLocaleDateString('vi-VN')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Owner</span>
                <p className="font-medium mt-0.5">{lead.owner?.name || '-'}</p>
              </div>
            </div>
            {lead.campaign && (
              <div className="text-xs">
                <span className="text-muted-foreground">Campaign: </span>
                <span className="font-medium">{lead.campaign}</span>
              </div>
            )}
            {lead.notes && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{lead.notes}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CustomerPanel() {
  const { selectedConversationId, conversationDetail, rightPanelTab, setRightPanelTab } = useCRMStore()

  if (!selectedConversationId || !conversationDetail) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Chọn hội thoại để xem thông tin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'info' | 'notes' | 'lead')} className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b bg-transparent h-10 p-0">
          <TabsTrigger value="info" className="flex-1 rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-10">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-10">
            Ghi chú
          </TabsTrigger>
          <TabsTrigger value="lead" className="flex-1 rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-10">
            Lead
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="info" className="mt-0"><InfoTab /></TabsContent>
            <TabsContent value="notes" className="mt-0"><NotesTab /></TabsContent>
            <TabsContent value="lead" className="mt-0"><LeadTab /></TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}