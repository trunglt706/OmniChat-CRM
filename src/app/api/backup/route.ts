import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const BACKUP_DIR = join(process.cwd(), 'data', 'backups')
const DB_PATH = join(process.cwd(), 'db', 'custom.db')

interface BackupMeta {
  id: string
  filename: string
  size: number
  createdAt: string
  tables: string[]
  rowCount: number
}

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })
}

function getBackupList(): BackupMeta[] {
  ensureBackupDir()
  try {
    const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'))
    return files.map(f => {
      const stat = statSync(join(BACKUP_DIR, f))
      return {
        id: f.replace('.db', ''),
        filename: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        tables: [],
        rowCount: 0,
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch { return [] }
}

// GET /api/backup — list backups
export async function GET() {
  const list = getBackupList()
  return NextResponse.json({ data: list, total: list.length })
}

// POST /api/backup — create backup
export async function POST(req: NextRequest) {
  try {
    if (!existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 })
    }

    ensureBackupDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const id = `backup_${timestamp}`
    const filename = `${id}.db`
    const destPath = join(BACKUP_DIR, filename)

    // Use sqlite3 .backup command or raw copy
    const dbData = readFileSync(DB_PATH)
    writeFileSync(destPath, dbData)

    const stat = statSync(destPath)

    return NextResponse.json({
      data: {
        id,
        filename,
        size: stat.size,
        createdAt: new Date().toISOString(),
        tables: [],
        rowCount: 0,
      },
      message: 'Backup created successfully',
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Backup failed' }, { status: 500 })
  }
}

// DELETE /api/backup?id=xxx — delete a backup
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing backup id' }, { status: 400 })
    }

    const filePath = join(BACKUP_DIR, `${id}.db`)
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    unlinkSync(filePath)
    return NextResponse.json({ message: 'Backup deleted' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 })
  }
}
