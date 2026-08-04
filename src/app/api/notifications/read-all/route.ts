import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { db } from '@/lib/db'

// PATCH /api/notifications/read-all — mark all notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: getSecurityEnv().NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db.notification.updateMany({
      where: { userId: token.sub as string, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('PATCH /api/notifications/read-all error:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
