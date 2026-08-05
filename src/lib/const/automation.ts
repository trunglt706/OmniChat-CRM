// ─── Automation Panel Constants ───

import type { LucideIcon } from 'lucide-react'
import { Bot, UserPlus, Tag, Wand2, Sparkles } from 'lucide-react'

export type ActionType = 'auto_reply' | 'assign_agent' | 'tag' | 'auto_reply_assign' | 'auto_reply_tag'

export interface AutomationRule {
  id: number
  name: string
  keyword: string
  replyMessage: string | null
  assignTo: { id: number; name: string } | null
  tag: { id: number; name: string; color: string } | null
  enabled: boolean
  createdAt: string
}

export const ACTION_TYPES: { key: ActionType; labelKey: string; icon: LucideIcon; descKey: string }[] = [
  { key: 'auto_reply',       labelKey: 'auto.type.autoReply',    icon: Bot,      descKey: 'auto.type.autoReplyDesc' },
  { key: 'assign_agent',     labelKey: 'auto.type.assignAgent',   icon: UserPlus, descKey: 'auto.type.assignAgentDesc' },
  { key: 'tag',             labelKey: 'auto.type.tag',          icon: Tag,      descKey: 'auto.type.tagDesc' },
  { key: 'auto_reply_assign', labelKey: 'auto.type.replyAssign',  icon: Wand2,    descKey: 'auto.type.replyAssignDesc' },
  { key: 'auto_reply_tag',   labelKey: 'auto.type.replyTag',    icon: Sparkles, descKey: 'auto.type.replyTagDesc' },
]

export function getActionTypeInfo(type: string) {
  return ACTION_TYPES.find(a => a.key === type) || ACTION_TYPES[0]
}
