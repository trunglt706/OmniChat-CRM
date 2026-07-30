'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
// Native scroll
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Zap, Plus, Trash2, Pencil, Bot, UserPlus, Tag, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent, Tag } from '@/lib/types'

interface AutomationRule {
  id: string
  name: string
  keyword: string
  replyMessage: string | null
  assignTo: { id: string; name: string } | null
  tag: { id: string; name: string; color: string } | null
  enabled: boolean
}

export default function AutomationPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AutomationRule | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formName, setFormName] = useState('')
  const [formKeyword, setFormKeyword] = useState('')
  const [formReply, setFormReply] = useState('')
  const [formAgent, setFormAgent] = useState('')
  const [formTag, setFormTag] = useState('')

  const fetchData = async () => {
    try {
      const [rulesRes, agentsRes, tagsRes] = await Promise.all([
        fetch('/api/automation/rules'),
        fetch('/api/agents'),
        fetch('/api/tags'),
      ])
      setRules(await rulesRes.json())
      setAgents(await agentsRes.json())
      setTags(await tagsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setFormName(''); setFormKeyword(''); setFormReply(''); setFormAgent(''); setFormTag('')
    setEditing(null); setShowCreate(false)
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditing(rule)
    setFormName(rule.name)
    setFormKeyword(rule.keyword)
    setFormReply(rule.replyMessage || '')
    setFormAgent(rule.assignTo?.id || '')
    setFormTag(rule.tag?.id || '')
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formKeyword.trim()) return
    try {
      if (editing) {
        await fetch('/api/automation/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: formName, keyword: formKeyword, replyMessage: formReply || null, assignToId: formAgent || null, tagId: formTag || null, enabled: editing.enabled }),
        })
      } else {
        await fetch('/api/automation/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, keyword: formKeyword, replyMessage: formReply || null, assignToId: formAgent || null, tagId: formTag || null }),
        })
      }
      resetForm()
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/automation/rules?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleToggle = async (rule: AutomationRule) => {
    await fetch('/api/automation/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled, name: rule.name, keyword: rule.keyword }),
    })
    fetchData()
  }

  // Seed default rules
  const seedRules = async () => {
    const defaultRules = [
      { name: 'Hỏi giá sản phẩm', keyword: 'giá', replyMessage: 'Cảm ơn bạn đã quan tâm! Để nhận báo giá chi tiết, vui lòng cho biết sản phẩm và số lượng bạn cần ạ.', assignToId: null, tagId: null, enabled: true },
      { name: 'Khiếu nại', keyword: 'phàn nàn', replyMessage: 'Chúng tôi xin lỗi về trải nghiệm không tốt. Chúng tôi sẽ kiểm tra và phản hồi bạn sớm nhất trong 30 phút.', assignToId: null, tagId: null, enabled: true },
      { name: 'Hỗ trợ kỹ thuật', keyword: 'lỗi', replyMessage: null, assignToId: null, tagId: null, enabled: true },
    ]
    for (const r of defaultRules) {
      await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
    }
    fetchData()
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5" /> Automation Rules
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Tự động phản hồi, phân công và gắn tag theo từ khóa</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {rules.length === 0 && (
              <Button variant="outline" size="sm" onClick={seedRules} className="text-xs">
                Tạo mẫu
              </Button>
            )}
            <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Thêm rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">{editing ? 'Sửa' : 'Tạo'} Automation Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Tên rule</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ví dụ: Hỏi giá sản phẩm" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Từ khóa kích hoạt</Label>
                    <Input value={formKeyword} onChange={(e) => setFormKeyword(e.target.value)} placeholder="Ví dụ: giá, khiếu nại, hỗ trợ" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Bot className="h-3 w-3" /> Tin nhắn tự động (tuỳ chọn)</Label>
                    <Textarea value={formReply} onChange={(e) => setFormReply(e.target.value)} placeholder="Nội dung tin nhắn tự động..." className="text-sm min-h-[60px] resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><UserPlus className="h-3 w-3" /> Phân công cho Agent (tuỳ chọn)</Label>
                    <Select value={formAgent} onValueChange={setFormAgent}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn agent..." /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> Gắn Tag (tuỳ chọn)</Label>
                    <Select value={formTag} onValueChange={setFormTag}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn tag..." /></SelectTrigger>
                      <SelectContent>
                        {tags.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={resetForm}>Huỷ</Button>
                  <Button size="sm" onClick={handleSave} disabled={!formName.trim() || !formKeyword.trim()}>
                    {editing ? 'Cập nhật' : 'Tạo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Zap className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Chưa có automation rule nào</p>
              <p className="text-xs mt-1">Tạo rule để tự động phản hồi, phân công và gắn tag</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className={cn(!rule.enabled && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5">"{rule.keyword}"</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rule.replyMessage && (
                          <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">
                            <Bot className="h-3 w-3" /> Auto-reply
                          </div>
                        )}
                        {rule.assignTo && (
                          <div className="flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md">
                            <UserPlus className="h-3 w-3" /> {rule.assignTo.name}
                          </div>
                        )}
                        {rule.tag && (
                          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ backgroundColor: rule.tag.color + '15', color: rule.tag.color }}>
                            <Tag className="h-3 w-3" /> {rule.tag.name}
                          </div>
                        )}
                      </div>
                      {rule.replyMessage && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{rule.replyMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch checked={rule.enabled} onCheckedChange={() => handleToggle(rule)} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(rule)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}