export interface Agent {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  status: string
}

export interface CustomerIdentity {
  id: string
  platform: string
  platformUserId: string | null
  platformPageId: string | null
  platformUserName: string | null
  platformAvatar: string | null
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  avatar: string | null
  gender: string | null
  birthday: string | null
  company: string | null
  address: string | null
  note: string | null
  identities: CustomerIdentity[]
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  description: string | null
}

export interface ConversationTag {
  id: string
  conversationId: string
  tagId: string
  tag: Tag
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderType: 'customer' | 'agent' | 'bot' | 'system'
  senderId: string | null
  senderName: string | null
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'system' | 'event'
  content: string | null
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentType: string | null
  platformMessageId: string | null
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface InternalNote {
  id: string
  conversationId: string | null
  customerId: string | null
  authorId: string
  author: { id: string; name: string; avatar: string | null }
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  customerId: string | null
  conversationId: string | null
  source: string | null
  campaign: string | null
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  value: number | null
  ownerId: string | null
  owner: { id: string; name: string; avatar: string | null } | null
  nextFollowup: string | null
  probability: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  customerId: string
  channel: string
  status: 'open' | 'pending' | 'resolved' | 'closed' | 'spam' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string | null
  slaFirstResponse: string | null
  slaResolve: string | null
  ownerId: string | null
  createdAt: string
  updatedAt: string
  customer: Customer
  owner: { id: string; name: string; avatar: string | null; status: string } | null
  followers?: { id: string; name: string; avatar: string | null }[]
  tags: ConversationTag[]
  notes?: InternalNote[]
  leads?: Lead[]
  messageCount?: number
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

// Re-exported from channel adapter system — single source of truth
// Client-side code should import ChannelType from here.
// Server-side code should import from '@/lib/channels'.
export type ChannelType = 'website' | 'facebook_messenger' | 'facebook_comment' | 'zalo' | 'telegram' | 'chatwork' | 'email'

/**
 * Client-side channel config (label, color, icon name).
 * This is a static mirror for frontend components that can't access the registry.
 * Server-side code should use channelRegistry instead.
 *
 * NOTE: When adding a new channel, update BOTH:
 *   1. Create adapter in src/lib/channels/adapters/ and register in registry.ts
 *   2. Add entry here for client-side usage
 */
export const CHANNEL_CONFIG: Record<ChannelType, { label: string; color: string; icon: string }> = {
  website: { label: 'Website', color: '#10b981', icon: 'Globe' },
  facebook_messenger: { label: 'Messenger', color: '#1877f2', icon: 'MessageCircle' },
  facebook_comment: { label: 'FB Comment', color: '#1877f2', icon: 'MessageSquare' },
  zalo: { label: 'Zalo', color: '#0068ff', icon: 'Phone' },
  telegram: { label: 'Telegram', color: '#26a5e4', icon: 'Send' },
  chatwork: { label: 'Chatwork', color: '#ee2224', icon: 'Users' },
  email: { label: 'Email', color: '#ea4335', icon: 'Mail' },
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-slate-100 text-slate-600' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
  spam: { label: 'Spam', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-400' },
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

export const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-cyan-100 text-cyan-700' },
  qualified: { label: 'Qualified', color: 'bg-emerald-100 text-emerald-700' },
  proposal: { label: 'Proposal', color: 'bg-violet-100 text-violet-700' },
  negotiation: { label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
}
