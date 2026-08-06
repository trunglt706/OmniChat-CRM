import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'
import { db } from '@/lib/db'

/**
 * PUT /api/auth/me/settings — Persist user settings to DB.
 * Accepts partial AppSettings object.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()

    // Merge with existing settings
    let existing: Record<string, unknown> = {}
    try {
      existing = user.settings ? JSON.parse(user.settings) : {}
    } catch {}

    const merged = { ...existing, ...body }
    const settingsStr = JSON.stringify(merged)

    await db.user.update({
      where: { id: user.id },
      data: { settings: settingsStr },
    })

    return NextResponse.json({ success: true, settings: merged })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
