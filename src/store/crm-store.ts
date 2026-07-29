import { create } from 'zustand'
import type { Conversation, ConversationDetail, Message, Tag, Agent, InternalNote } from '@/lib/types'

interface CRMState {
  // Conversations list
  conversations: Conversation[]
  setConversations: (data: Conversation[]) => void
  totalConversations: number
  setTotalConversations: (n: number) => void

  // Filters
  activeFilter: string
  setActiveFilter: (f: string) => void
  activeChannel: string
  setActiveChannel: (c: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Selected conversation
  selectedConversationId: string | null
  setSelectedConversationId: (id: string | null) => void
  conversationDetail: ConversationDetail | null
  setConversationDetail: (d: ConversationDetail | null) => void

  // Messages
  messages: Message[]
  setMessages: (m: Message[]) => void
  addMessage: (m: Message) => void
  isSendingMessage: boolean
  setIsSendingMessage: (v: boolean) => void

  // Right panel
  rightPanelTab: 'info' | 'notes' | 'lead'
  setRightPanelTab: (t: 'info' | 'notes' | 'lead') => void

  // Data
  tags: Tag[]
  setTags: (t: Tag[]) => void
  agents: Agent[]
  setAgents: (a: Agent[]) => void

  // Notes
  notes: InternalNote[]
  setNotes: (n: InternalNote[]) => void
  addNote: (n: InternalNote) => void

  // Loading
  isLoadingConversations: boolean
  setIsLoadingConversations: (v: boolean) => void
  isLoadingConversation: boolean
  setIsLoadingConversation: (v: boolean) => void
}

export const useCRMStore = create<CRMState>((set) => ({
  conversations: [],
  setConversations: (data) => set({ conversations: data }),
  totalConversations: 0,
  setTotalConversations: (n) => set({ totalConversations: n }),

  activeFilter: 'open',
  setActiveFilter: (f) => set({ activeFilter: f }),
  activeChannel: 'all',
  setActiveChannel: (c) => set({ activeChannel: c }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id, conversationDetail: null, messages: [], notes: [] }),
  conversationDetail: null,
  setConversationDetail: (d) => set({ conversationDetail: d }),

  messages: [],
  setMessages: (m) => set({ messages: m }),
  addMessage: (m) => set((state) => ({ messages: [...state.messages, m] })),
  isSendingMessage: false,
  setIsSendingMessage: (v) => set({ isSendingMessage: v }),

  rightPanelTab: 'info',
  setRightPanelTab: (t) => set({ rightPanelTab: t }),

  tags: [],
  setTags: (t) => set({ tags: t }),
  agents: [],
  setAgents: (a) => set({ agents: a }),

  notes: [],
  setNotes: (n) => set({ notes: n }),
  addNote: (n) => set((state) => ({ notes: [n, ...state.notes] })),

  isLoadingConversations: false,
  setIsLoadingConversations: (v) => set({ isLoadingConversations: v }),
  isLoadingConversation: false,
  setIsLoadingConversation: (v) => set({ isLoadingConversation: v }),
}))
