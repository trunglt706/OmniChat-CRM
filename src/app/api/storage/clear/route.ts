import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorageDriver } from '@/lib/storage'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Verify password
    const user = await db.user.findUnique({ where: { id: parseInt((session.user as any).id) } })
    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 403 })
    }

    const storage = getStorageDriver()
    await storage.clear()

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error clearing storage', 'StorageAPI', { error: String(error) })
    return NextResponse.json({ error: 'Failed to clear storage' }, { status: 500 })
  }
}
