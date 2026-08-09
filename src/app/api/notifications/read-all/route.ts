import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getAuthUser } from '@/lib/session'

// PATCH /api/notifications/read-all — mark all notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = user.id

    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    logger.error('PATCH /api/notifications/read-all error', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
