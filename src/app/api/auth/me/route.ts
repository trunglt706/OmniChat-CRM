import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json(user)
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
