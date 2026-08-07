import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSpecificDriver } from '@/lib/storage'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { from, to } = body // e.g. from 'file' to 's3' or vice versa

    if (!from || !to || from === to) {
      return NextResponse.json({ error: 'Invalid source and target drivers' }, { status: 400 })
    }

    const sourceDriver = getSpecificDriver(from as 'file' | 's3')
    const targetDriver = getSpecificDriver(to as 'file' | 's3')

    const sourceFiles = await sourceDriver.list()
    const targetFiles = await targetDriver.list()
    const targetFileNames = new Set(targetFiles.map(f => f.name))

    let syncCount = 0
    let errorCount = 0

    // Only upload missing files
    for (const file of sourceFiles) {
      if (!targetFileNames.has(file.name)) {
        try {
          const buffer = await sourceDriver.getFileBuffer(file.name)
          const ext = file.name.split('.').pop() || ''
          
          let mimeType = 'application/octet-stream'
          if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg'
          else if (ext === 'png') mimeType = 'image/png'
          else if (ext === 'gif') mimeType = 'image/gif'
          else if (ext === 'pdf') mimeType = 'application/pdf'
          else if (ext === 'zip') mimeType = 'application/zip'

          await targetDriver.upload(buffer, file.name, mimeType)
          syncCount++
        } catch (e) {
          logger.error(`Error syncing file ${file.name} from ${from} to ${to}`, 'StorageAPI', { error: String(e) })
          errorCount++
        }
      }
    }

    return NextResponse.json({ success: true, synced: syncCount, errors: errorCount })
  } catch (error) {
    logger.error('Error syncing storage', 'StorageAPI', { error: String(error) })
    return NextResponse.json({ error: 'Failed to sync storage' }, { status: 500 })
  }
}
