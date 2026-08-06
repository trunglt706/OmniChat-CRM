import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.avatar,
      role: user.role,
    })
  } catch (error) {
    logger.error('Userinfo error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
