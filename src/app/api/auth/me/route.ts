import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'
import { db } from '@/lib/db'

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

/**
 * PUT /api/auth/me — Update current user's profile fields.
 * Accepts: { name?, email?, phone?, bio?, status? }
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const allowed = ['name', 'email', 'phone', 'bio', 'status'] as const
    const data: Record<string, string> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key]
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, bio: true, status: true, settings: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Auth me update error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
