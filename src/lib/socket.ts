import { useCRMStore } from '@/store/crm-store'

type EventCallback = (data: any) => void

/**
 * Socket service — realtime event bus for the CRM.
 * Uses SSE as transport (compatible with Next.js App Router)
 * and provides a socket-like API (on/off/emit).
 *
 * In production, swap the transport to native WebSocket
 * with zero changes to consuming components.
 */
class SocketService {
  private sse: EventSource | null = null
  private listeners = new Map<string, Set<EventCallback>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false
  private _active = false

  get connected() {
    return this._connected
  }

  /**
   * Connect to the SSE stream. Safe to call multiple times.
   */
  connect() {
    if (this.sse) return
    this._active = true
    this._createConnection()
  }

  private _createConnection() {
    if (!this._active || this.sse) return

    try {
      const es = new EventSource('/api/simulation')
      this.sse = es

      es.addEventListener('new_messages', (e) => {
        try {
          const data = JSON.parse(e.data)
          this._emit('new_messages', data)

          // Also dispatch granular events per conversation
          ;(data.messages || []).forEach((msg: any) => {
            this._emit(`message:${msg.conversationId}`, { message: msg })
            this._emit('conversation_update', { conversationId: msg.conversationId })
          })
        } catch {}
      })

      es.onopen = () => {
        this._connected = true
        this._emit('connect', {})
        useCRMStore.getState().setSocketConnected(true)
      }

      es.onerror = () => {
        this._connected = false
        useCRMStore.getState().setSocketConnected(false)
        this._destroyConnection()
        if (this._active) {
          this.reconnectTimer = setTimeout(() => this._createConnection(), 3000)
        }
      }
    } catch {
      if (this._active) {
        this.reconnectTimer = setTimeout(() => this._createConnection(), 3000)
      }
    }
  }

  private _destroyConnection() {
    if (this.sse) {
      this.sse.close()
      this.sse = null
    }
  }

  /**
   * Disconnect and stop reconnecting.
   */
  disconnect() {
    this._active = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this._destroyConnection()
    this._connected = false
    useCRMStore.getState().setSocketConnected(false)
    this._emit('disconnect', {})
  }

  /**
   * Subscribe to an event.
   */
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.off(event, callback)
  }

  /**
   * Unsubscribe from an event.
   */
  off(event: string, callback: EventCallback) {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(callback)
      if (set.size === 0) this.listeners.delete(event)
    }
  }

  /**
   * Emit to server (POST) and locally.
   */
  async emit(event: string, data?: any) {
    // Local dispatch first
    this._emit(event, data)

    // Server-side dispatch for specific events
    if (event === 'send_message' && data?.conversationId && data?.content) {
      try {
        await fetch(`/api/conversations/${data.conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: data.content,
            messageType: data.messageType || 'text',
            senderType: data.senderType || 'agent',
            senderName: data.senderName,
            attachmentUrl: data.attachmentUrl,
            attachmentName: data.attachmentName,
            attachmentType: data.attachmentType,
          }),
        })
      } catch (e) {
        console.error('[Socket] emit error:', e)
      }
    }
  }

  private _emit(event: string, data: any) {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((cb) => {
        try { cb(data) } catch (e) { console.error(`[Socket] error in ${event} handler:`, e) }
      })
    }
  }
}

// Singleton — shared across all components
export const socket = new SocketService()

/**
 * React hook for socket events.
 * Automatically subscribes on mount, unsubscribes on unmount.
 */
export function useSocketEvent(event: string, callback: EventCallback) {
  // We use a ref for the callback to avoid re-subscribing on every render
  const callbackRef = { current: callback }
  callbackRef.current = callback

  // Use subscribe pattern to avoid SSR issues
  if (typeof window !== 'undefined') {
    socket.on(event, (data) => callbackRef.current(data))
  }

  // Return cleanup function (caller should use in useEffect cleanup)
  return () => {
    if (typeof window !== 'undefined') {
      socket.off(event, callbackRef.current)
    }
  }
}
