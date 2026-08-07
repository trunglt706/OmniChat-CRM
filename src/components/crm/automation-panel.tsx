'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Zap, Plus, Trash2, Pencil, Bot, UserPlus, Tag, ArrowRight,
  Search, Loader2, Wand2, XCircle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'
import { apiFetch, apiPost, apiPut, generateIdempotencyKey } from '@/lib/api-client'
import { useT } from '@/i18n/useT'
import { type AutomationRule, type ActionType, ACTION_TYPES } from '@/lib/const/automation'

export default function AutomationPanel() {
  const { t } = useT()
  const storeAgents = useCRMStore((s) => s.agents)
  const setAgents = useCRMStore((s) => s.setAgents)
  const [rules, setRules] = useState<AutomationRule[]>([])
  const tags = useCRMStore((s) => s.tags)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AutomationRule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Debounce automation search: filter uses debouncedSearch, not searchQuery
  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(searchTimerRef.current)
  }, [searchQuery])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formKeyword, setFormKeyword] = useState('')
  const [formReply, setFormReply] = useState('')
  const [formAgent, setFormAgent] = useState('')
  const [formTag, setFormTag] = useState('')
  const [formActionType, setFormActionType] = useState<ActionType>('auto_reply')

  const fetchInitialData = async () => {
    try {
      const rulesRes = await fetch('/api/automation/rules')
      setRules(await rulesRes.json())
      // Load agents from store if empty
      if (storeAgents.length === 0) {
        const agentsRes = await fetch('/api/agents')
        const agentsData = await agentsRes.json()
        if (Array.isArray(agentsData)) setAgents(agentsData)
      }
    } catch (e) {
      logger.error('Failed to fetch initial automation data', 'AutomationPanel', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInitialData() }, [])

  const resetForm = () => {
    setFormName(''); setFormKeyword(''); setFormReply(''); setFormAgent(''); setFormTag(''); setFormActionType('auto_reply')
    setEditing(null); setShowCreate(false)
  }

  const openCreateForType = (type: ActionType) => {
    resetForm()
    setFormActionType(type)
    setShowCreate(true)
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditing(rule)
    setFormName(rule.name)
    setFormKeyword(rule.keyword)
    setFormReply(rule.replyMessage || '')
    setFormAgent(rule.assignTo?.id ? String(rule.assignTo.id) : '')
    setFormTag(rule.tag?.id ? String(rule.tag.id) : '')
    // Determine action type
    const hasReply = !!rule.replyMessage
    const hasAssign = !!rule.assignTo
    const hasTag = !!rule.tag
    if (hasReply && hasAssign) setFormActionType('auto_reply_assign')
    else if (hasReply && hasTag) setFormActionType('auto_reply_tag')
    else if (hasReply) setFormActionType('auto_reply')
    else if (hasAssign) setFormActionType('assign_agent')
    else if (hasTag) setFormActionType('tag')
    else setFormActionType('auto_reply')
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formKeyword.trim()) return
    setSaving(true)
    try {
      const needsReply = ['auto_reply', 'auto_reply_assign', 'auto_reply_tag'].includes(formActionType)
      const needsAgent = ['assign_agent', 'auto_reply_assign'].includes(formActionType)
      const needsTag = ['tag', 'auto_reply_tag'].includes(formActionType)

      const payload: Record<string, unknown> = {
        name: formName,
        keyword: formKeyword,
        replyMessage: needsReply ? (formReply || null) : null,
        assignToId: needsAgent ? (formAgent || null) : null,
        tagId: needsTag ? (formTag || null) : null,
      }
      if (editing) {
        payload.id = editing.id
        payload.enabled = editing.enabled
      }

      if (editing) {
        const updated = await apiPut<AutomationRule>('/api/automation/rules', payload)
        if (updated) {
          setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        }
      } else {
        const created = await apiPost<AutomationRule>('/api/automation/rules', payload, { idempotencyKey: generateIdempotencyKey() })
        if (created) {
          setRules((prev) => [created, ...prev])
        }
      }
      resetForm()
    } catch (e) {
      logger.error('Failed to save rule', 'AutomationPanel', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await apiFetch(`/api/automation/rules?id=${id}`, { method: 'DELETE' })
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      logger.error('Failed to delete rule', 'AutomationPanel', e)
    } finally {
      setDeleteConfirmId(null)
      setDeleting(false)
    }
  }

  const handleToggle = async (rule: AutomationRule) => {
    // Optimistic toggle
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
    try {
      await apiPut('/api/automation/rules', { id: rule.id, enabled: !rule.enabled, name: rule.name, keyword: rule.keyword })
    } catch (e) {
      // Revert if error
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)))
      logger.error('Failed to toggle rule', 'AutomationPanel', e)
    }
  }

  const { filteredRules, enabledCount, disabledCount } = useMemo(() => {
    const filtered = rules.filter(r => {
      if (!debouncedSearch) return true
      const q = debouncedSearch.toLowerCase()
      return r.name.toLowerCase().includes(q) || r.keyword.toLowerCase().includes(q)
    })
    const enabled = rules.filter(r => r.enabled).length
    return { filteredRules: filtered, enabledCount: enabled, disabledCount: rules.length - enabled }
  }, [rules, debouncedSearch])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 animate-breathe">
                <Zap className="h-5 w-5 text-white" />
              </div>
              {t('auto.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('auto.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {rules.length === 0 && (
              <Button variant="outline" size="sm" onClick={async () => {
                const defaults = [
                  { name: 'Hỏi giá sản phẩm', keyword: 'giá', replyMessage: 'Cảm ơn bạn đã quan tâm! Để nhận báo giá chi tiết, vui lòng cho biết sản phẩm và số lượng bạn cần ạ.', assignToId: null, tagId: null, enabled: true },
                  { name: 'Khiếu nại', keyword: 'phàn nàn', replyMessage: 'Chúng tôi xin lỗi về trải nghiệm không tốt. Chúng tôi sẽ kiểm tra và phản hồi bạn sớm nhất trong 30 phút.', assignToId: null, tagId: null, enabled: true },
                  { name: 'Hỗ trợ kỹ thuật', keyword: 'lỗi', replyMessage: null, assignToId: null, tagId: null, enabled: true },
                ]
                const createdList: AutomationRule[] = []
                for (const r of defaults) {
                  const created = await apiPost<AutomationRule>('/api/automation/rules', r, { idempotencyKey: generateIdempotencyKey() })
                  if (created) createdList.push(created)
                }
                if (createdList.length > 0) {
                  setRules((prev) => [...createdList, ...prev])
                }
              }} className="text-xs rounded-xl">
                {t('auto.createSample')}
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="text-xs gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-orange-500/20 transition-all hover:scale-105">
                  <Plus className="h-3.5 w-3.5" /> {t('auto.create')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-1.5 rounded-xl">
                <div className="px-2 py-1.5 mb-1">
                  <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">{t('auto.typeLabel')}</p>
                </div>
                <div className="space-y-0.5">
                  {ACTION_TYPES.map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.key}
                        onClick={() => openCreateForType(action.key)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs hover:bg-foreground/[0.04] transition-all text-left group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{t(action.labelKey)}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{t(action.descKey)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats */}
        {rules.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card card-lift rounded-xl p-3.5 text-center transition-all duration-300 hover:shadow-lg">
              <p className="text-2xl font-bold tabular-nums">{rules.length}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">{t('auto.total')}</p>
            </div>
            <div className="glass-card card-lift rounded-xl p-3.5 text-center transition-all duration-300 hover:shadow-lg hover:border-emerald-500/30">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{enabledCount}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">{t('auto.enabled')}</p>
            </div>
            <div className="glass-card card-lift rounded-xl p-3.5 text-center transition-all duration-300 hover:shadow-lg">
              <p className="text-2xl font-bold tabular-nums text-muted-foreground/40">{disabledCount}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">{t('auto.disabled')}</p>
            </div>
          </div>
        )}

        {/* Search */}
        {rules.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <Input
              placeholder={t('auto.search')}
              className="pl-9 h-9 text-[13px] rounded-xl glass-input focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="glass-card card-lift rounded-2xl p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 flex items-center justify-center animate-breathe">
              <Zap className="h-7 w-7 text-amber-500" />
            </div>
            <p className="text-sm font-semibold">{t('auto.empty')}</p>
            <p className="text-xs mt-1.5 text-muted-foreground/50 max-w-[280px] mx-auto">{t('auto.emptyDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRules.map((rule, idx) => {
              const hasReply = !!rule.replyMessage
              const hasAssign = !!rule.assignTo
              const hasTag = !!rule.tag
              return (
                <div
                  key={rule.id}
                  className={cn(
                    'glass-card rounded-xl p-4 transition-all duration-300 animate-slide-up group hover:shadow-md',
                    !rule.enabled && 'opacity-50'
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className="font-semibold text-sm">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-[20px] rounded-md bg-primary/5 border-primary/15">
                          "{rule.keyword}"
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                        {/* Action type badges */}
                        {hasReply && (
                          <div className="flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">
                            <Bot className="h-3 w-3" /> {t('auto.badge.autoReply')}
                          </div>
                        )}
                        {hasAssign && (
                          <div className="flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                            <UserPlus className="h-3 w-3" /> {rule.assignTo!.name}
                          </div>
                        )}
                        {hasTag && (
                          <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: rule.tag!.color + '15', color: rule.tag!.color }}>
                            <Tag className="h-3 w-3" /> {rule.tag!.name}
                          </div>
                        )}
                      </div>
                      {rule.replyMessage && (
                        <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-relaxed">{rule.replyMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch checked={rule.enabled} onCheckedChange={() => handleToggle(rule)} className="scale-75" />
                      {deleteConfirmId === rule.id ? (
                        <div className="flex items-center gap-0.5 animate-fade-in">
                          <span className="text-[10px] text-destructive font-medium">{t('notes.deleteConfirm')}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleDelete(rule.id)} disabled={deleting}>
                            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-destructive" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setDeleteConfirmId(null)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(rule)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => setDeleteConfirmId(rule.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {editing ? t('auto.edit') : t('auto.createTitle')} {t('auto.ruleTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('auto.ruleName')}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('auto.ruleNamePlaceholder')} className="h-9 text-sm rounded-xl glass-input focus-visible:ring-0" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('auto.keyword')}</Label>
              <Input value={formKeyword} onChange={(e) => setFormKeyword(e.target.value)} placeholder={t('auto.keywordPlaceholder')} className="h-9 text-sm rounded-xl glass-input focus-visible:ring-0" />
            </div>

            {/* Action type indicator */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Wand2 className="h-3 w-3" /> {t('auto.actionType')}
              </Label>
              <div className="bg-foreground/[0.03] rounded-xl p-3 flex flex-wrap gap-1.5">
                {ACTION_TYPES.map((at) => {
                  const Icon = at.icon
                  const active = formActionType === at.key
                  return (
                    <button
                      key={at.key}
                      onClick={() => setFormActionType(at.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.05]'
                      )}
                    >
                      <Icon className="h-3 w-3" /> {t(at.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Conditional fields based on action type */}
            {['auto_reply', 'auto_reply_assign', 'auto_reply_tag'].includes(formActionType) && (
              <div className="space-y-2 animate-fade-in">
                <Label className="text-xs font-medium flex items-center gap-1.5"><Bot className="h-3 w-3" /> {t('auto.autoMessage')}</Label>
                <Textarea value={formReply} onChange={(e) => setFormReply(e.target.value)} placeholder={t('auto.autoMessagePlaceholder')} className="text-sm min-h-[70px] resize-none rounded-xl glass-input focus-visible:ring-0" />
              </div>
            )}
            {['assign_agent', 'auto_reply_assign'].includes(formActionType) && (
              <div className="space-y-2 animate-fade-in">
                <Label className="text-xs font-medium flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> {t('auto.assignToAgent')}</Label>
                <Select value={formAgent} onValueChange={setFormAgent}>
                  <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue placeholder={t('auto.selectAgent')} /></SelectTrigger>
                  <SelectContent>
                    {storeAgents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {['tag', 'auto_reply_tag'].includes(formActionType) && (
              <div className="space-y-2 animate-fade-in">
                <Label className="text-xs font-medium flex items-center gap-1.5"><Tag className="h-3 w-3" /> {t('auto.assignTag')}</Label>
                <Select value={formTag} onValueChange={setFormTag}>
                  <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue placeholder={t('auto.selectTag')} /></SelectTrigger>
                  <SelectContent>
                    {tags.map((tg) => (
                      <SelectItem key={tg.id} value={String(tg.id)}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tg.color }} />
                          {tg.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={resetForm} className="rounded-xl">{t('auto.cancel')}</Button>
            <Button size="sm" onClick={handleSave} disabled={!formName.trim() || !formKeyword.trim() || saving} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {editing ? t('auto.update') : t('auto.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}