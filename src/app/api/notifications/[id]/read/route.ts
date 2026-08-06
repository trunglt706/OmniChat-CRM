import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// PATCH /api/notifications/[id]/read — mark single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: getSecurityEnv().NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const userId = Number(token.sub)
    if (isNaN(id) || isNaN(userId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

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
