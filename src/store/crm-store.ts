import { create } from 'zustand'
import type { Conversation, ConversationDetail, Message, Tag, Agent, InternalNote } from '@/lib/types'

// ─── Notification Types ───
export type NotificationType = 'new_message' | 'assignment' | 'sla_breach' | 'mention' | 'system' | 'automation'
export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string
  conversationId?: number
  read: boolean
  createdAt: string
}

// ─── User Profile (extended) ───
export interface UserProfile {
  id: number
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
  desktopNotifications?: boolean
  messagePreview?: boolean
  emailNotification?: boolean
  showCustomerPanel?: boolean
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
  selectedConversationId: number | null
  setSelectedConversationId: (id: number | null) => void
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
  updateAgentStatus: (agentId: number | string, status: string) => void

  // Notes
  notes: InternalNote[]
  setNotes: (n: InternalNote[]) => void
  addNote: (n: InternalNote) => void
  updateNote: (id: number, patch: Partial<InternalNote>) => void
  deleteNote: (id: number) => void

  // Loading
  isLoadingConversations: boolean
  setIsLoadingConversations: (v: boolean) => void
  isLoadingConversation: boolean
  setIsLoadingConversation: (v: boolean) => void

  // View
  activeView: 'inbox' | 'dashboard' | 'automation' | 'reports'
  setActiveView: (v: 'inbox' | 'dashboard' | 'automation' | 'reports') => void

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
  unreadCounts: Record<number, number>
  setUnreadCounts: (counts: Record<number, number>) => void
  incrementUnread: (conversationId: number) => void
  clearUnread: (conversationId: number) => void

  // ─── Notifications ───
  notifications: AppNotification[]
  setNotifications: (n: AppNotification[]) => void
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  clearNotification: (id: number) => void
  clearAllNotifications: () => void
  unreadNotificationCount: () => number
  loadNotifications: () => Promise<void>

  // ─── Settings ───
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  initSettingsFromDB: (settingsJson: string | null) => void

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

type NotifQueueItem =
  | { action: 'create'; data: Omit<AppNotification, 'id' | 'read' | 'createdAt'>; id?: number }
  | { action: 'read'; id: number }
  | { action: 'readAll' }
  | { action: 'delete'; id: number }
  | { action: 'deleteAll' }

let _notifCounter = 0
let _settingsPersistTimer: ReturnType<typeof setTimeout> | null = null
let _notifPersistQueue: NotifQueueItem[] = []
let _notifFlushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Background-flush notification changes to the DB.
 * Batches rapid actions (e.g. markAllRead) into fewer API calls.
 */
function flushNotifToDB() {
  if (_notifFlushTimer) clearTimeout(_notifFlushTimer)
  _notifFlushTimer = setTimeout(async () => {
    const queue = _notifPersistQueue.splice(0, _notifPersistQueue.length)
    if (queue.length === 0) return
    try {
      const { apiPost, apiFetch } = await import('@/lib/api-client')
      for (const item of queue) {
        switch (item.action) {
          case 'create':
            await apiPost('/api/notifications', item.data).catch(() => {})
            break
          case 'read':
            await apiFetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {})
            break
          case 'readAll':
            await apiFetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {})
            break
          case 'delete':
            await apiFetch(`/api/notifications?id=${item.id}`, { method: 'DELETE' }).catch(() => {})
            break
          case 'deleteAll':
            await apiFetch('/api/notifications', { method: 'DELETE' }).catch(() => {})
            break
        }
      }
    } catch {}
  }, 300)
}

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
  updateAgentStatus: (agentId, status) => set((s) => ({
    agents: s.agents.map((a) => (String(a.id) === String(agentId) ? { ...a, status: status as any } : a)),
  })),

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
  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  currentUser: null,
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
  setNotifications: (n) => set({ notifications: n }),
  addNotification: (n) => {
    _notifCounter++
    const notif: AppNotification = {
      ...n,
      id: -(Date.now() * 1000 + _notifCounter), // negative ID = client-generated
      read: false,
      createdAt: new Date().toISOString(),
    }
    // Optimistic: update UI immediately
    set((s) => ({ notifications: [notif, ...s.notifications] }))
    // Background: persist to DB (only for non-client-generated IDs on next load)
    _notifPersistQueue.push({ action: 'create', data: n, id: notif.id })
    flushNotifToDB()
    // Sound & desktop notification
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
  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }))
    // Background persist (skip client-generated negative IDs)
    if (id > 0) {
      _notifPersistQueue.push({ action: 'read', id })
      flushNotifToDB()
    }
  },
  markAllNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map(n => ({ ...n, read: true }))
    }))
    _notifPersistQueue.push({ action: 'readAll' })
    flushNotifToDB()
  },
  clearNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter(n => n.id !== id)
    }))
    if (id > 0) {
      _notifPersistQueue.push({ action: 'delete', id })
      flushNotifToDB()
    }
  },
  clearAllNotifications: () => {
    set({ notifications: [] })
    _notifPersistQueue.push({ action: 'deleteAll' })
    flushNotifToDB()
  },
  unreadNotificationCount: () => get().notifications.filter(n => !n.read).length,
  /**
   * Load notifications from DB (call after login).
   * Merges with any client-side notifications that were created
   * before the DB load completed.
   */
  loadNotifications: async () => {
    try {
      const { apiFetch } = await import('@/lib/api-client')
      const res: any = await apiFetch('/api/notifications?limit=50')
      const dbNotifs: AppNotification[] = (res.data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        conversationId: n.conversationId,
        read: n.read,
        createdAt: n.createdAt,
      }))
      // Merge: keep any client-generated notifs that aren't in DB yet
      const existing = get().notifications
      const dbIds = new Set(dbNotifs.map(n => n.id))
      const localOnly = existing.filter(n => n.id < 0 && !dbIds.has(n.id))
      set({ notifications: [...localOnly, ...dbNotifs] })
    } catch {}
  },

  // ─── Settings ───
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    // Debounce DB persistence (500ms) to avoid rapid writes
    if (typeof window !== 'undefined') {
      if (_settingsPersistTimer) clearTimeout(_settingsPersistTimer)
      const currentSettings = get().settings
      _settingsPersistTimer = setTimeout(() => {
        import('@/lib/api-client').then(({ apiPut }) => {
          apiPut('/api/auth/me/settings', currentSettings).catch(() => {})
        }).catch(() => {})
      }, 500)
    }
  },
  /**
   * Initialize settings from DB user data.
   * Call this after login with the user's settings JSON string.
   */
  initSettingsFromDB: (settingsJson: string | null) => {
    try {
      const parsed = settingsJson ? JSON.parse(settingsJson) : {}
      const merged = { ...DEFAULT_SETTINGS, ...parsed }
      set({ settings: merged })
    } catch {}
  },

  // ─── UI Sheets ───
  openSheet: null,
  setOpenSheet: (s) => set({ openSheet: s }),

  // ─── Socket ───
  socketConnected: false,
  setSocketConnected: (v) => set({ socketConnected: v }),
}))
