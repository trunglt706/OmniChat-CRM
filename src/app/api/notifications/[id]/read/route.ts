import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getAuthUser } from '@/lib/session'

// PATCH /api/notifications/[id]/read — mark single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const userId = user.id
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await db.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    logger.error('PATCH /api/notifications/[id]/read error', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
