import { NextRequest, NextResponse } from 'next/server'
import { loadSecurityConfig, saveSecurityConfig, type SecurityConfig } from '@/lib/security'

// GET /api/security/config
export async function GET() {
  const config = loadSecurityConfig()
  return NextResponse.json(config)
}

// PUT /api/security/config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const current = loadSecurityConfig()

    const updated: SecurityConfig = {
      rateLimitPerMinute: typeof body.rateLimitPerMinute === 'number'
        ? Math.max(1, Math.min(10000, body.rateLimitPerMinute))
        : current.rateLimitPerMinute,
      rateLimitEnabled: typeof body.rateLimitEnabled === 'boolean' ? body.rateLimitEnabled : current.rateLimitEnabled,
      blacklistEnabled: typeof body.blacklistEnabled === 'boolean' ? body.blacklistEnabled : current.blacklistEnabled,
    }

    saveSecurityConfig(updated)
    return NextResponse.json({ data: updated, message: 'Config updated' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update config' }, { status: 500 })
  }
}
