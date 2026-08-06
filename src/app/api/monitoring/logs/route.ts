import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'
import { getAuthUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const levelFilter = searchParams.get('level')?.toLowerCase()

    const config = logger.getConfiguration()
    const fullPath = path.isAbsolute(config.filePath)
      ? config.filePath
      : path.join(process.cwd(), config.filePath)

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({
        config,
        logs: [],
        total: 0,
        message: 'Log file does not exist yet.',
      })
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8')
    const lines = fileContent.trim().split('\n').filter(Boolean)

    let parsedLogs = lines.map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return { raw: line }
      }
    })

    if (levelFilter) {
      parsedLogs = parsedLogs.filter((log) => log.level === levelFilter)
    }

    const recentLogs = parsedLogs.slice(-limit).reverse()

    return NextResponse.json({
      config,
      total: lines.length,
      returned: recentLogs.length,
      logs: recentLogs,
    })
  } catch (error) {
    logger.error('Log monitoring endpoint error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
