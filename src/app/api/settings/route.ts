import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidateTag } from 'next/cache'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const settings = await db.systemSetting.findMany()
    const config: Record<string, string> = {}
    settings.forEach(s => { config[s.key] = s.value })
    
    return NextResponse.json(config)
  } catch (error) {
    logger.error('Error fetching system settings', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized or require admin role' }, { status: 401 })
    }

    const data = await request.json()
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const ops = Object.entries(data).map(([key, value]) => {
      return db.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    })

    await db.$transaction(ops)
    revalidateTag('seo-settings')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error updating system settings', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
