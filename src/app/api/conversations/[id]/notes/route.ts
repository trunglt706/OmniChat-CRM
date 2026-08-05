import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

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
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { content, isPinned = false, customerId } = await request.json();

  // Use first available agent as author for mock
  const firstAgent = await db.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstAgent) {
    return NextResponse.json({ error: 'No agent found' }, { status: 500 });
  }

  const note = await db.internalNote.create({
    data: {
      conversationId: id,
      customerId: customerId ? Number(customerId) : null,
      authorId: firstAgent.id,
      content,
      isPinned,
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationIdStr } = await params;
  const conversationId = Number(conversationIdStr);
  if (isNaN(conversationId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await request.json();
  const { noteId: noteIdStr, content, isPinned } = body;
  const noteId = Number(noteIdStr);
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (content !== undefined) data.content = content;
  if (isPinned !== undefined) data.isPinned = isPinned;

  const note = await db.internalNote.update({
    where: { id: noteId, conversationId },
    data,
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(note);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationIdStr } = await params;
  const conversationId = Number(conversationIdStr);
  if (isNaN(conversationId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const noteIdStr = searchParams.get('noteId');
  if (!noteIdStr) return NextResponse.json({ error: 'noteId required' }, { status: 400 });
  const noteId = Number(noteIdStr);

  await db.internalNote.delete({
    where: { id: noteId, conversationId },
  });

  return NextResponse.json({ success: true });
}
