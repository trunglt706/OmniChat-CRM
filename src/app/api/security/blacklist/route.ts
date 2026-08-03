import { NextRequest, NextResponse } from 'next/server'
import { loadBlacklist, saveBlacklist, invalidateBlacklistCache, type BlacklistEntry } from '@/lib/security'

// GET /api/security/blacklist — list all blacklist entries
export async function GET() {
  const list = loadBlacklist()
  return NextResponse.json({ data: list, total: list.length })
}

// POST /api/security/blacklist — add entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, value, reason } = body as { type: 'ip' | 'email'; value: string; reason?: string }

    if (!type || !value || !['ip', 'email'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Use ip or email' }, { status: 400 })
    }

    if (type === 'ip') {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^[\da-fA-F:]+$|^\*$/
      if (!ipRegex.test(value.trim())) {
        return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
      }
    }

    if (type === 'email') {
      if (!value.includes('@')) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
    }

    const list = loadBlacklist()

    if (list.some(e => e.type === type && e.value.toLowerCase() === value.trim().toLowerCase())) {
      return NextResponse.json({ error: 'Entry already exists' }, { status: 409 })
    }

    const entry: BlacklistEntry = {
      type,
      value: value.trim().toLowerCase(),
      reason: reason || '',
      addedAt: new Date().toISOString(),
      addedBy: 'admin',
    }
    list.push(entry)
    saveBlacklist(list)
    invalidateBlacklistCache()

    return NextResponse.json({ data: entry, message: 'Added to blacklist' }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to add entry' }, { status: 500 })
  }
}

// DELETE /api/security/blacklist — remove entry
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as 'ip' | 'email'
    const value = searchParams.get('value')

    if (!type || !value) {
      return NextResponse.json({ error: 'Missing type and value params' }, { status: 400 })
    }

    let list = loadBlacklist()
    const initial = list.length
    list = list.filter(e => !(e.type === type && e.value === value))

    if (list.length === initial) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    saveBlacklist(list)
    invalidateBlacklistCache()
    return NextResponse.json({ message: 'Removed from blacklist' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to remove entry' }, { status: 500 })
  }
}
