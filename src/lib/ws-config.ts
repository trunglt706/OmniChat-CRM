// ─── WebSocket & Realtime Configuration ───
// Reads from environment variables with sensible defaults.
// Supports 3 transport modes: sse (default), websocket, socketio.

export type WsTransport = 'sse' | 'websocket' | 'socketio'

export interface WsConfig {
  /** Transport mode: sse | websocket | socketio */
  transport: WsTransport
  /** WebSocket server URL (for websocket/socketio external servers) */
  url: string
  /** Reconnect base interval in ms */
  reconnectInterval: number
  /** Maximum reconnect attempts before giving up (0 = infinite) */
  maxReconnectAttempts: number
  /** Heartbeat/ping interval in ms (0 = disabled) */
  heartbeatInterval: number
  /** SSE poll interval in ms (only used when transport=sse) */
  ssePollInterval: number
  /** Connection timeout in ms */
  connectionTimeout: number
  /** Enable desktop notification on realtime events */
  desktopNotifications: boolean
  /** Enable sound on new message realtime events */
  soundNotifications: boolean
  /** Max notification sound cooldown between repeats in ms */
  soundCooldown: number

  get isSSE(): boolean
  get isWebSocket(): boolean
  get isSocketIO(): boolean
}

let _cachedConfig: WsConfig | null = null

export function getWsConfig(): WsConfig {
  if (_cachedConfig) return _cachedConfig

  const transport = (process.env.WS_TRANSPORT || 'sse') as WsTransport

  _cachedConfig = {
    transport,
    url: process.env.WS_URL || '',
    reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '3000', 10),
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS || '0', 10),
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '25000', 10),
    ssePollInterval: parseInt(process.env.SSE_POLL_INTERVAL || '2000', 10),
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '10000', 10),
    desktopNotifications: process.env.REALTIME_DESKTOP_NOTIF !== 'false',
    soundNotifications: process.env.REALTIME_SOUND_NOTIF !== 'false',
    soundCooldown: parseInt(process.env.REALTIME_SOUND_COOLDOWN || '3000', 10),

    get isSSE() { return this.transport === 'sse' },
    get isWebSocket() { return this.transport === 'websocket' },
    get isSocketIO() { return this.transport === 'socketio' },
  }

  return _cachedConfig
}

/** Validate and return a summary for the test endpoint */
export function getWsConfigSummary(): Record<string, unknown> {
  const c = getWsConfig()
  return {
    transport: c.transport,
    url: c.url || '(embedded SSE)',
    reconnectInterval: `${c.reconnectInterval}ms`,
    maxReconnectAttempts: c.maxReconnectAttempts === 0 ? 'infinite' : c.maxReconnectAttempts,
    heartbeatInterval: c.heartbeatInterval === 0 ? 'disabled' : `${c.heartbeatInterval}ms`,
    ssePollInterval: `${c.ssePollInterval}ms`,
    connectionTimeout: `${c.connectionTimeout}ms`,
    desktopNotifications: c.desktopNotifications,
    soundNotifications: c.soundNotifications,
    soundCooldown: `${c.soundCooldown}ms`,
  }
}