import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await db.internalNote.findMany({
    where: { conversationId: id },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, isPinned = false, customerId } = await request.json();

  // Use first available agent as author for mock
  const firstAgent = await db.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstAgent) {
    return NextResponse.json({ error: 'No agent found' }, { status: 500 });
  }

  const note = await db.internalNote.create({
    data: {
      conversationId: id,
      customerId: customerId || null,
      authorId: firstAgent.id,
      content,
      isPinned,
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
