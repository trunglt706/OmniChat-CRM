import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSecurityEnv } from '@/lib/redis'
import { getLogSummary, getRecentLogs, getAlerts, getMemoryBufferLogs } from '@/lib/request-logger'
import { getAuthUser } from '@/lib/session'

/**
 * GET /api/monitoring?view=summary|logs|alerts|memory&limit=100
 * 
 * Admin-only endpoint for viewing request logs, alerts, and system health.
 */
export async function GET(request: Request) {
  try {
    const env = getSecurityEnv()
    const user = await getAuthUser(request as any)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'summary'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (limit > 500) {
      return NextResponse.json({ error: 'Limit max is 500' }, { status: 400 })
    }

    switch (view) {
      case 'summary': {
        const summary = await getLogSummary()
        const systemInfo = {
          uptime: Math.round(process.uptime()),
          memoryUsage: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
          nodeVersion: process.version,
        }
        return NextResponse.json({ ...summary, system: systemInfo })
      }

      case 'logs': {
        const logs = getRecentLogs(limit)
        return NextResponse.json({ logs, total: logs.length })
      }

      case 'alerts': {
        const alerts = await getAlerts(limit)
        return NextResponse.json({ alerts, total: alerts.length })
      }

      case 'memory': {
        const logs = getMemoryBufferLogs()
        return NextResponse.json({ logs: logs.slice(0, limit), total: logs.length })
      }

      default:
        return NextResponse.json({ error: 'Invalid view. Use: summary, logs, alerts, memory' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal error', message: error.message },
      { status: 500 }
    )
  }
}
