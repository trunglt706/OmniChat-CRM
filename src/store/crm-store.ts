import { create } from 'zustand'
import type { Conversation, ConversationDetail, Message, Tag, Agent, InternalNote } from '@/lib/types'

// ─── Notification Types ───
export type NotificationType = 'new_message' | 'assignment' | 'sla_breach' | 'mention' | 'system' | 'automation'
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  conversationId?: string
  read: boolean
  createdAt: string
}

// ─── User Profile (extended) ───
export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar: string | null
  status: 'online' | 'busy' | 'away' | 'offline'
  bio: string
}

// ─── Settings ───
export interface AppSettings {
  soundEnabled: boolean
  desktopNotifEnabled: boolean
  emailNotifEnabled: boolean
  compactMode: boolean
  showPreview: boolean
  autoAssign: boolean
  language: 'vi' | 'en' | 'zh'
}

// ─── UI Sheet state ───
export type OpenSheet = null | 'notifications' | 'profile' | 'settings'

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
  prependMessages: (m: Message[]) => void
  addMessage: (m: Message) => void
  isSendingMessage: boolean
  setIsSendingMessage: (v: boolean) => void

  // Message pagination
  hasMoreMessages: boolean
  setHasMoreMessages: (v: boolean) => void
  isLoadingMoreMessages: boolean
  setIsLoadingMoreMessages: (v: boolean) => void

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
  updateNote: (id: string, patch: Partial<InternalNote>) => void
  deleteNote: (id: string) => void

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
  currentUser: UserProfile | null
  setCurrentUser: (u: UserProfile | null) => void

  // Unread counts per conversation
  unreadCounts: Record<string, number>
  setUnreadCounts: (counts: Record<string, number>) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void

  // ─── Notifications ───
  notifications: AppNotification[]
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
  unreadNotificationCount: () => number

  // ─── Settings ───
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void

  // ─── UI Sheets ───
  openSheet: OpenSheet
  setOpenSheet: (s: OpenSheet) => void

  // ─── Socket ───
  socketConnected: boolean
  setSocketConnected: (v: boolean) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  desktopNotifEnabled: true,
  emailNotifEnabled: false,
  compactMode: false,
  showPreview: true,
  autoAssign: true,
  language: 'vi',
}

const DEFAULT_USER: UserProfile = {
  id: 'user_01',
  name: 'Pham Minh Tuan',
  email: 'tuan.pm@omnichat.vn',
  phone: '0901 234 567',
  role: 'admin',
  avatar: null,
  status: 'online',
  bio: 'Senior Customer Support Agent',
}

let _notifCounter = 0

export const useCRMStore = create<CRMState>((set, get) => ({
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
  setSelectedConversationId: (id) => set({
    selectedConversationId: id,
    conversationDetail: null,
    messages: [],
    notes: [],
    hasMoreMessages: false,
    isLoadingMoreMessages: false,
  }),
  conversationDetail: null,
  setConversationDetail: (d) => set({ conversationDetail: d }),

  messages: [],
  setMessages: (m) => set({ messages: m }),
  prependMessages: (newMsgs) => set((s) => ({
    messages: [...newMsgs, ...s.messages],
  })),
  addMessage: (m) => set((state) => ({ messages: [...state.messages, m] })),
  isSendingMessage: false,
  setIsSendingMessage: (v) => set({ isSendingMessage: v }),

  // Message pagination
  hasMoreMessages: false,
  setHasMoreMessages: (v) => set({ hasMoreMessages: v }),
  isLoadingMoreMessages: false,
  setIsLoadingMoreMessages: (v) => set({ isLoadingMoreMessages: v }),

  rightPanelTab: 'info',
  setRightPanelTab: (t) => set({ rightPanelTab: t }),

  tags: [],
  setTags: (t) => set({ tags: t }),
  agents: [],
  setAgents: (a) => set({ agents: a }),

  notes: [],
  setNotes: (n) => set({ notes: n }),
  addNote: (n) => set((state) => ({ notes: [n, ...state.notes] })),
  updateNote: (id, patch) => set((s) => ({
    notes: s.notes.map(n => n.id === id ? { ...n, ...patch } : n),
  })),
  deleteNote: (id) => set((s) => ({ notes: s.notes.filter(n => n.id !== id) })),

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
  isAuthenticated: true,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  currentUser: DEFAULT_USER,
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

  // ─── Notifications ───
  notifications: [],
  addNotification: (n) => {
    _notifCounter++
    const notif: AppNotification = {
      ...n,
      id: `notif_${Date.now()}_${_notifCounter}`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ notifications: [notif, ...s.notifications] }))
    if (get().settings.soundEnabled) {
      try {
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch {}
    }
    if (get().settings.desktopNotifEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body, icon: '/icon.png' })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') new Notification(n.title, { body: n.body })
          })
        }
      } catch {}
    }
  },
  markNotificationRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllNotificationsRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true }))
  })),
  clearNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(n => n.id !== id)
  })),
  clearAllNotifications: () => set({ notifications: [] }),
  unreadNotificationCount: () => get().notifications.filter(n => !n.read).length,

  // ─── Settings ───
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnichat_settings', JSON.stringify({ ...get().settings, ...patch }))
      }
    } catch {}
  },

  // ─── UI Sheets ───
  openSheet: null,
  setOpenSheet: (s) => set({ openSheet: s }),

  // ─── Socket ───
  socketConnected: false,
  setSocketConnected: (v) => set({ socketConnected: v }),
}))
