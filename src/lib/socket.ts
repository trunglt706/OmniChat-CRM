import { useCRMStore } from '@/store/crm-store'
import { getWsConfig, type WsTransport } from './ws-config'

type EventCallback = (data: any) => void

/**
 * Socket service — realtime event bus for the CRM.
 * Supports 3 transport modes:
 *   - SSE (default): Uses EventSource, compatible with Next.js App Router
 *   - WebSocket: Native WebSocket connection to external WS server
 *   - Socket.IO: Socket.IO client connection (lazy-loaded)
 *
 * Transport is determined by WS_TRANSPORT env var via ws-config.ts.
 * All transports expose the same on/off/emit API for zero-change migration.
 */
class SocketService {
  private sse: EventSource | null = null
  private ws: WebSocket | null = null
  private socketIo: any = null
  private listeners = new Map<string, Set<EventCallback>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _connected = false
  private _active = false
  private _reconnectAttempts = 0
  private _transport: WsTransport = 'sse'

  get connected() {
    return this._connected
  }

  get transport() {
    return this._transport
  }

  /**
   * Connect to the realtime stream. Safe to call multiple times.
   */
  connect() {
    if (this.sse || this.ws || this.socketIo) return
    const config = getWsConfig()
    this._transport = config.transport
    this._active = true
    this._reconnectAttempts = 0
    this._createConnection()
  }

  private _createConnection() {
    if (!this._active) return
    if (this.sse || this.ws || this.socketIo) return

    const config = getWsConfig()

    switch (config.transport) {
      case 'sse':
        this._createSSE(config.ssePollInterval)
        break
      case 'websocket':
        this._createWebSocket(config.url, config.heartbeatInterval)
        break
      case 'socketio':
        this._createSocketIO(config.url, config.heartbeatInterval)
        break
    }
  }

  // ─── SSE Transport ───
  private _createSSE(pollInterval: number) {
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
        this._setConnected(true)
      }

      es.onerror = () => {
        this._setConnected(false)
        this._destroyConnection()
        if (this._active) this._scheduleReconnect()
      }
    } catch {
      if (this._active) this._scheduleReconnect()
    }
  }

  // ─── Native WebSocket Transport ───
  private _createWebSocket(url: string, heartbeatMs: number) {
    if (!url) {
      console.warn('[Socket] WS_TRANSPORT=websocket but WS_URL is not set, falling back to SSE')
      this._transport = 'sse'
      this._createSSE(getWsConfig().ssePollInterval)
      return
    }

    try {
      const ws = new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        this._setConnected(true)
        this._reconnectAttempts = 0

        // Start heartbeat
        if (heartbeatMs > 0) {
          this.heartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', t: Date.now() }))
            }
          }, heartbeatMs)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const eventType = data.type || data.event || 'message'
          const payload = data.data || data.payload || data

          this._emit(eventType, payload)

          // Granular conversation events
          if (eventType === 'new_messages' && payload.messages) {
            payload.messages.forEach((msg: any) => {
              this._emit(`message:${msg.conversationId}`, { message: msg })
              this._emit('conversation_update', { conversationId: msg.conversationId })
            })
          }
        } catch {
          // Non-JSON message, emit as raw
          this._emit('message', event.data)
        }
      }

      ws.onclose = () => {
        this._setConnected(false)
        this._clearHeartbeat()
        this._destroyConnection()
        if (this._active) this._scheduleReconnect()
      }

      ws.onerror = () => {
        // onclose will fire after this
      }
    } catch {
      if (this._active) this._scheduleReconnect()
    }
  }

  // ─── Socket.IO Transport (lazy-loaded) ───
  private async _createSocketIO(url: string, heartbeatMs: number) {
    if (!url) {
      console.warn('[Socket] WS_TRANSPORT=socketio but WS_URL is not set, falling back to SSE')
      this._transport = 'sse'
      this._createSSE(getWsConfig().ssePollInterval)
      return
    }

    try {
      // Lazy-load socket.io-client to avoid bundling when not used
      const { io } = await import('socket.io-client')
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: false, // we handle reconnection ourselves
      })
      this.socketIo = socket

      socket.on('connect', () => {
        this._setConnected(true)
        this._reconnectAttempts = 0
      })

      // Listen for all OmniChat events
      const omniEvents = ['new_messages', 'conversation_update', 'notification', 'presence']
      omniEvents.forEach((evt) => {
        socket.on(evt, (data: any) => {
          this._emit(evt, data)
          if (evt === 'new_messages' && data?.messages) {
            data.messages.forEach((msg: any) => {
              this._emit(`message:${msg.conversationId}`, { message: msg })
            })
          }
        })
      })

      socket.on('disconnect', () => {
        this._setConnected(false)
        this._destroyConnection()
        if (this._active) this._scheduleReconnect()
      })

      socket.on('connect_error', () => {
        this._setConnected(false)
      })
    } catch (e) {
      console.error('[Socket] Socket.IO load failed, falling back to SSE:', e)
      this._transport = 'sse'
      this._createSSE(getWsConfig().ssePollInterval)
    }
  }

  // ─── Connection lifecycle ───
  private _setConnected(connected: boolean) {
    this._connected = connected
    useCRMStore.getState().setSocketConnected(connected)
    this._emit(connected ? 'connect' : 'disconnect', {})
  }

  private _scheduleReconnect() {
    const config = getWsConfig()
    if (config.maxReconnectAttempts > 0 && this._reconnectAttempts >= config.maxReconnectAttempts) {
      console.warn(`[Socket] Max reconnect attempts (${config.maxReconnectAttempts}) reached, giving up`)
      return
    }

    // Exponential backoff with jitter: base * 2^attempt + random(0, 1000)
    const base = config.reconnectInterval
    const backoff = Math.min(base * Math.pow(2, this._reconnectAttempts), 30000)
    const jitter = Math.random() * 1000
    const delay = backoff + jitter

    this._reconnectAttempts++
    console.log(`[Socket] Reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => this._createConnection(), delay)
  }

  private _clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private _destroyConnection() {
    if (this.sse) {
      this.sse.close()
      this.sse = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.socketIo) {
      this.socketIo.disconnect()
      this.socketIo = null
    }
    this._clearHeartbeat()
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
    this._reconnectAttempts = 0
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
  const callbackRef = { current: callback }
  callbackRef.current = callback

  if (typeof window !== 'undefined') {
    socket.on(event, (data) => callbackRef.current(data))
  }

  return () => {
    if (typeof window !== 'undefined') {
      socket.off(event, callbackRef.current)
    }
  }
}