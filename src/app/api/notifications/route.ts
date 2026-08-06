import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { db } from '@/lib/db'

// GET /api/notifications — list current user's notifications
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: getSecurityEnv().NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = Number(token.sub)
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { userId }
    if (unreadOnly) where.read = false

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
    ])

    // Transform to AppNotification format
    const notifications = data.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      conversationId: n.conversationId || undefined,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))

    return NextResponse.json({ data: notifications, total })
  } catch (e: any) {
    console.error('GET /api/notifications error:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}

// POST /api/notifications — create notification for current user
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: getSecurityEnv().NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = Number(token.sub)
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const { type, title, body: notifBody, conversationId } = body

    if (!type || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing required fields: type, title, body' }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        body: notifBody,
        conversationId: conversationId ? Number(conversationId) : null,
      },
    })

    return NextResponse.json({
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        conversationId: notification.conversationId || undefined,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/notifications error:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}

// DELETE /api/notifications — clear all or single
export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: getSecurityEnv().NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = Number(token.sub)
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const singleIdStr = searchParams.get('id')

    if (singleIdStr) {
      const singleId = Number(singleIdStr)
      // Delete single notification (must belong to current user)
      await db.notification.deleteMany({
        where: { id: singleId, userId },
      })
    } else {
      // Clear all notifications for current user
      await db.notification.deleteMany({
        where: { userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DELETE /api/notifications error:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
