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

  // View
  activeView: 'inbox' | 'dashboard' | 'automation'
  setActiveView: (v: 'inbox' | 'dashboard' | 'automation') => void

  // Bot
  botEnabled: boolean
  setBotEnabled: (v: boolean) => void
  isBotTyping: boolean
  setIsBotTyping: (v: boolean) => void

  // Mobile responsive
  mobileView: 'list' | 'chat' | 'panel'
  setMobileView: (v: 'list' | 'chat' | 'panel') => void
  showRightPanel: boolean
  setShowRightPanel: (v: boolean) => void

  // Simulation
  simulationRunning: boolean
  setSimulationRunning: (v: boolean) => void
  simulationMessages: Message[]
  addSimulationMessage: (m: Message) => void
  clearSimulationMessages: () => void

  // Auth
  isAuthenticated: boolean
  setAuthenticated: (v: boolean) => void
  currentUser: { id: string; name: string; email: string; avatar?: string | null } | null
  setCurrentUser: (u: { id: string; name: string; email: string; avatar?: string | null } | null) => void

  // Unread counts per conversation
  unreadCounts: Record<string, number>
  setUnreadCounts: (counts: Record<string, number>) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
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

  activeView: 'inbox' as const,
  setActiveView: (v) => set({ activeView: v }),

  botEnabled: false,
  setBotEnabled: (v) => set({ botEnabled: v }),
  isBotTyping: false,
  setIsBotTyping: (v) => set({ isBotTyping: v }),

  // Mobile responsive
  mobileView: 'list' as const,
  setMobileView: (v) => set({ mobileView: v }),
  showRightPanel: true,
  setShowRightPanel: (v) => set({ showRightPanel: v }),

  // Simulation
  simulationRunning: false,
  setSimulationRunning: (v) => set({ simulationRunning: v }),
  simulationMessages: [],
  addSimulationMessage: (m) => set((s) => ({ simulationMessages: [...s.simulationMessages, m] })),
  clearSimulationMessages: () => set({ simulationMessages: [] }),

  // Auth
  isAuthenticated: true, // MVP: start authenticated, will use NextAuth
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  currentUser: { id: 'user_01', name: 'Phạm Minh Tuấn', email: 'tuan.pm@omnichat.vn' },
  setCurrentUser: (u) => set({ currentUser: u }),

  // Unread counts per conversation
  unreadCounts: {},
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  incrementUnread: (conversationId) => set((s) => ({
    unreadCounts: { ...s.unreadCounts, [conversationId]: (s.unreadCounts[conversationId] || 0) + 1 }
  })),
  clearUnread: (conversationId) => set((s) => {
    const next = { ...s.unreadCounts }
    delete next[conversationId]
    return { unreadCounts: next }
  }),
}))
