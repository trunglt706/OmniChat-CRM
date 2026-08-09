import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const sessions = await db.userSession.findMany({
      where: { userId: id },
      orderBy: { lastActive: 'desc' },
      take: 20
    })

    return NextResponse.json({ sessions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const { tokenId } = await req.json()

    if (!tokenId) {
      return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })
    }

    await db.userSession.delete({
      where: { token: tokenId, userId: id }
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
