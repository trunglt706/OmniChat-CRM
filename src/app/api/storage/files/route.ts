import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorageDriver } from '@/lib/storage'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorageDriver()
    const files = await storage.list()
    const stats = await storage.getStats()

    return NextResponse.json({ files, stats })
  } catch (error) {
    logger.error('Error fetching storage files', 'StorageAPI', { error: String(error) })
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { fileName } = body

    if (!fileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 })
    }

    const storage = getStorageDriver()
    await storage.delete(fileName)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting storage file', 'StorageAPI', { error: String(error) })
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
