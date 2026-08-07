import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name.toLowerCase()
    const ext = originalName.split('.').pop() || ''

    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'zip', 'rar']
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain',
      'application/zip', 'application/x-rar-compressed', 'application/x-zip-compressed'
    ]

    if (!ext || !allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Loại file không được phép tải lên. Đuôi file không hợp lệ.' }, { status: 400 })
    }

    if (file.type && !allowedMimeTypes.includes(file.type) && file.type !== 'application/octet-stream') {
      return NextResponse.json({ error: 'Loại file không được phép tải lên. Mime type không hợp lệ.' }, { status: 400 })
    }

    const fileName = `${uuidv4()}.${ext}`

    const storage = (await import('@/lib/storage')).getStorageDriver()
    const url = await storage.upload(buffer, fileName, file.type || 'application/octet-stream')

    return NextResponse.json({ success: true, url })

  } catch (error) {
    logger.error('Error uploading file', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
