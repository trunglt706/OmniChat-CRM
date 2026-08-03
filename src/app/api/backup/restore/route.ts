import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const BACKUP_DIR = join(process.cwd(), 'data', 'backups')
const DB_PATH = join(process.cwd(), 'db', 'custom.db')

// POST /api/backup/restore — restore from backup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { backupId } = body as { backupId: string }

    if (!backupId) {
      return NextResponse.json({ error: 'Missing backupId' }, { status: 400 })
    }

    const backupPath = join(BACKUP_DIR, `${backupId}.db`)
    if (!existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    // Create a pre-restore backup of current state
    const dbDir = join(process.cwd(), 'db')
    if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
    const backupDir = join(process.cwd(), 'data', 'backups')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

    if (existsSync(DB_PATH)) {
      const preRestoreId = `pre_restore_${Date.now()}`
      const preRestorePath = join(backupDir, `${preRestoreId}.db`)
      writeFileSync(preRestorePath, readFileSync(DB_PATH))
    }

    // Copy backup to DB path
    writeFileSync(DB_PATH, readFileSync(backupPath))

    return NextResponse.json({
      message: 'Restore successful. Please restart the server for changes to take full effect.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Restore failed' }, { status: 500 })
  }
}
