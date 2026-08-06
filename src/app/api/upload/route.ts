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

    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!ext || !allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Loại file không được phép tải lên. Vui lòng chọn ảnh hợp lệ.' }, { status: 400 })
    }

    const fileName = `${uuidv4()}.${ext}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (e) {
      // Ignore
    }

    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    const url = `/uploads/${fileName}`
    return NextResponse.json({ success: true, url })

  } catch (error) {
    logger.error('Error uploading file', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
