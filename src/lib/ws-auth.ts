/**
 * WebSocket / SSE Private Channel Authentication.
 *
 * The current SocketService uses SSE (EventSource), which sends
 * the session cookie automatically. But we should verify the user
 * has access to specific conversations/channels.
 *
 * For future native WebSocket migration, this module provides:
 * 1. Token-based auth on WS handshake
 * 2. Channel-level authorization (user can only sub to their own conversations)
 * 3. Presence tracking per user
 */

import { getToken } from 'next-auth/jwt'
import { getRedis } from './redis'
import { db } from './db'
import type { NextRequest } from 'next/server'

const WS_AUTH_PREFIX = 'ws:auth:'
const WS_CHANNEL_PREFIX = 'ws:ch:'
const WS_PRESENCE_PREFIX = 'ws:presence:'
const WS_AUTH_TTL = 86400 // 24h (matches session)

interface WsUser {
  id: string
  name: string
  role: string
  tenantId?: string
}

/**
 * Authenticate a WebSocket/SSE connection request.
 * Returns user info or null if not authenticated.
 */
export async function authenticateWsConnection(request: NextRequest): Promise<WsUser | null> {
  // Try JWT from cookie first
  const secret = process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production'

  // Check query param (for WS protocols that can't send cookies)
  const tokenParam = request.nextUrl.searchParams.get('token')
  if (tokenParam) {
    try {
      const { jwt } = await import('next-auth/jwt')
      const token = await jwt.decode({ token: tokenParam, secret })
      if (token?.sub) {
        const user = await db.user.findUnique({
          where: { id: token.sub as string },
          select: { id: true, name: true, role: true, organizationId: true },
        })
        if (user) {
          return {
            id: user.id,
            name: user.name,
            role: user.role,
            tenantId: user.organizationId || undefined,
          }
        }
      }
    } catch { /* invalid token param */ }
  }

  // Fallback: check cookie
  try {
    const token = await getToken({ req: request, secret, cookieName: 'next-auth.session-token' })
    if (!token?.sub) return null

    const user = await db.user.findUnique({
      where: { id: token.sub as string },
      select: { id: true, name: true, role: true, organizationId: true },
    })

    if (!user) return null

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      tenantId: user.organizationId || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Check if a user is authorized to subscribe to a conversation channel.
 * Users can subscribe to conversations they own or follow.
 */
export async function authorizeChannelAccess(
  userId: string,
  channel: string
): Promise<boolean> {
  const redis = getRedis()
  const cacheKey = `ws:chauth:${userId}:${channel}`

  // Check cache first
  const cached = await redis.get(cacheKey)
  if (cached === '1') return true
  if (cached === '0') return false

  // Parse channel name: conversation:{id} or user:{id}
  if (channel.startsWith('conversation:')) {
    const conversationId = channel.replace('conversation:', '')
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { ownerId: true },
    })

    const authorized = conversation?.ownerId === userId
    await redis.set(cacheKey, authorized ? '1' : '0', 300) // 5min cache
    return authorized
  }

  if (channel.startsWith('user:')) {
    const targetUserId = channel.replace('user:', '')
    // Users can subscribe to their own notifications
    const authorized = targetUserId === userId
    await redis.set(cacheKey, authorized ? '1' : '0', 300)
    return authorized
  }

  // Global channels (dashboard, notifications)
  if (['dashboard', 'notifications', 'system'].includes(channel)) {
    return true
  }

  return false
}

/**
 * Set user presence (online/offline).
 */
export async function setPresence(
  userId: string,
  status: 'online' | 'offline' | 'away'
): Promise<void> {
  const redis = getRedis()
  const key = `${WS_PRESENCE_PREFIX}${userId}`
  await redis.set(key, JSON.stringify({ status, at: Date.now() }), 300) // 5min TTL
}

/**
 * Get user presence.
 */
export async function getPresence(userId: string): Promise<{ status: string; at: number } | null> {
  const redis = getRedis()
  const data = await redis.get(`${WS_PRESENCE_PREFIX}${userId}`)
  if (!data) return null
  try { return JSON.parse(data) } catch { return null }
}

/**
 * Extend presence TTL (called on heartbeat).
 */
export async function heartbeatPresence(userId: string): Promise<void> {
  const redis = getRedis()
  const key = `${WS_PRESENCE_PREFIX}${userId}`
  const exists = await redis.exists(key)
  if (exists) {
    await redis.expire(key, 300)
  }
}
